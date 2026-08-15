import { describe, expect, it } from 'vitest'

import { BackupManager } from '@/adapters/backup/backup-manager'
import { BaselineManager } from '@/adapters/baseline/baseline-manager'
import { PATHS } from '@/constants/paths'
import { RestoreService } from '@/services/restore-service'
import { BackupService } from '@/services/backup-service'
import { createMemoryFs, MEMORY_HOME, type MemoryFs } from '../helpers/memory-fs'

function setup(initial: Record<string, string> = {}) {
  const fs = createMemoryFs(initial)
  const backupManager = new BackupManager(fs)
  const baselines = new BaselineManager(fs, backupManager)
  const backups = new BackupService(backupManager)
  const restore = new RestoreService({ fs, baselines, backups })
  return { fs, backupManager, baselines, backups, restore }
}

describe('RestoreService.plan', () => {
  it('captured → 精确还原；absent → 删除', async () => {
    const { fs, baselines, restore } = setup({ [PATHS.claudeSettings]: '{"env":{}}' })
    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])
    await baselines.captureIfAbsent('codex', [
      PATHS.codexConfig,
      PATHS.codexAuth,
      PATHS.codexModels,
    ])
    // 模拟切换后：captured 文件被改写、absent 文件被应用创建
    fs.files().set(PATHS.claudeSettings, '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-app"}}')
    fs.files().set(PATHS.codexConfig, 'model = "glm-4.6"')

    const plan = await restore.plan()

    expect(plan.hasBaseline).toBe(true)
    const claude = plan.files.find((item) => item.file === PATHS.claudeSettings)
    expect(claude).toMatchObject({ action: 'restore-baseline', approximate: false })
    const codexConfig = plan.files.find((item) => item.file === PATHS.codexConfig)
    expect(codexConfig).toMatchObject({ action: 'delete', approximate: false })
    expect(fs.files().size).toBeGreaterThan(0)
  })

  it('无基线（老用户）→ 有备份走最早备份（近似），无备份降级剥离托管键', async () => {
    const { backupManager, restore } = setup({
      [PATHS.claudeSettings]: '{"env":{}}',
      [PATHS.codexAuth]: '{"OPENAI_API_KEY":"sk-x"}',
    })
    await backupManager.backup('claude-code', PATHS.claudeSettings)

    const plan = await restore.plan()

    expect(plan.hasBaseline).toBe(false)
    const claude = plan.files.find((item) => item.file === PATHS.claudeSettings)
    expect(claude).toMatchObject({ action: 'restore-earliest-backup', approximate: true })
    const auth = plan.files.find((item) => item.file === PATHS.codexAuth)
    expect(auth).toMatchObject({ action: 'strip-managed-keys', approximate: true })
  })

  it('文件当前不存在 → 跳过', async () => {
    const { restore } = setup()

    const plan = await restore.plan()

    for (const item of plan.files) {
      expect(item.action).toBe('keep')
    }
  })
})

describe('RestoreService.execute', () => {
  it('captured：基线副本逐字节还原', async () => {
    const original = '{"env":{"OTHER_KEY":"keep-me"},"permissions":{"allow":["Bash"]}}'
    const { fs, baselines, restore } = setup({ [PATHS.claudeSettings]: original })
    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])
    fs.files().set(PATHS.claudeSettings, '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-app"}}')
    fs.restricted().length = 0

    const result = await restore.execute()

    expect(result.allSucceeded).toBe(true)
    expect(fs.files().get(PATHS.claudeSettings)).toBe(original)
    // 安装前已存在的用户目录不被还原流程重新收紧（不改变用户既有权限设置）
    expect(fs.restricted()).not.toContain(PATHS.claudeDir)
  })

  it('absent：删除应用创建的文件；目录为应用创建且已空时一并删除', async () => {
    const { fs, baselines, restore } = setup()
    await baselines.captureIfAbsent('codex', [
      PATHS.codexConfig,
      PATHS.codexAuth,
      PATHS.codexModels,
    ])
    // 模拟切换后应用创建的文件
    fs.files().set(PATHS.codexAuth, '{"OPENAI_API_KEY":"sk-app"}')

    const result = await restore.execute()

    expect(result.allSucceeded).toBe(true)
    expect(fs.files().has(PATHS.codexAuth)).toBe(false)
    // ~/.codex 由应用创建且删除后为空 → 目录键一并清理
    expect(await fs.exists(PATHS.codexDir)).toBe(false)
  })

  it('目录内尚有用户文件时不删除目录', async () => {
    const { fs, baselines, restore } = setup({ '.claude/CLAUDE.md': '# user' })
    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])
    fs.files().set(PATHS.claudeSettings, '{"env":{}}')

    await restore.execute()

    expect(fs.files().has('.claude/CLAUDE.md')).toBe(true)
    expect(await fs.exists(PATHS.claudeDir)).toBe(true)
  })

  it('degraded：还原最早一份备份（近似）', async () => {
    // 直接落两份不同时间戳的备份（backup() 用真实时钟，同秒会互相覆盖）
    const { fs, baselines, restore } = setup({
      [`${PATHS.backupsDir}/claude-code/20260101-000000--settings.json`]:
        '{"env":{"OTHER_KEY":"original"}}',
      [`${PATHS.backupsDir}/claude-code/20260102-000000--settings.json`]:
        '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-app"}}',
      [PATHS.claudeSettings]: '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-app"}}',
    })
    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])
    expect(
      (await baselines.manifest()).tools['claude-code']?.files[PATHS.claudeSettings]?.status
    ).toBe('degraded')

    const result = await restore.execute()

    expect(result.allSucceeded).toBe(true)
    expect(fs.files().get(PATHS.claudeSettings)).toBe('{"env":{"OTHER_KEY":"original"}}')
  })
})

describe('RestoreService.execute 竞态兜底', () => {
  it('计划后目标文件已被用户删除 → 跳过且不报错', async () => {
    const { fs, baselines, restore } = setup()
    await baselines.captureIfAbsent('codex', [
      PATHS.codexConfig,
      PATHS.codexAuth,
      PATHS.codexModels,
    ])
    // 用户在还原前手动删除了应用创建的文件（含 .codex 目录内全部内容）
    fs.files().delete(PATHS.codexConfig)
    fs.files().delete(PATHS.codexAuth)
    fs.files().delete(PATHS.codexModels)

    const result = await restore.execute()

    expect(result.allSucceeded).toBe(true)
    expect(result.results.map((item) => item.status).every((s) => s === 'skipped')).toBe(true)
  })
})

describe('RestoreService.execute 安全与兜底', () => {
  it('无基线无备份：剥离托管键，用户自有配置保留', async () => {
    const { fs, restore } = setup({
      [PATHS.claudeSettings]:
        '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-app","ANTHROPIC_MODEL":"glm-4.6","OTHER_KEY":"keep-me"}}',
      [PATHS.codexAuth]: '{"OPENAI_API_KEY":"sk-app","Tokens":[]}',
    })

    const result = await restore.execute()

    expect(result.allSucceeded).toBe(true)
    expect(JSON.parse(fs.files().get(PATHS.claudeSettings) ?? '{}')).toEqual({
      env: { OTHER_KEY: 'keep-me' },
    })
    // auth.json 保留用户自有字段 Tokens，仅删除应用写入的 OPENAI_API_KEY
    expect(JSON.parse(fs.files().get(PATHS.codexAuth) ?? '{}')).toEqual({ Tokens: [] })
  })

  it('单文件失败不中断，结果如实上报', async () => {
    const base = setup({
      [PATHS.claudeSettings]: '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-app","OTHER_KEY":"keep"}}',
      [PATHS.codexAuth]: '{"OPENAI_API_KEY":"sk-app"}',
    })
    const failing: MemoryFs = {
      ...base.fs,
      writeTextFile(path, contents) {
        if (path.startsWith(PATHS.claudeSettings)) {
          return Promise.reject(new Error('EACCES'))
        }
        return base.fs.writeTextFile(path, contents)
      },
    }
    const restore = new RestoreService({
      fs: failing,
      baselines: base.baselines,
      backups: base.backups,
    })

    const result = await restore.execute()

    expect(result.allSucceeded).toBe(false)
    const failed = result.results.find((item) => item.file === PATHS.claudeSettings)
    expect(failed?.status).toBe('failed')
    expect(failed?.detail).toBeTruthy()
    expect(result.results.find((item) => item.file === PATHS.codexAuth)?.status).toBe('done')
  })
})

describe('RestoreService.execute 应用数据不动', () => {
  it('~/.aiswitch（预设/备份/基线）完全不动', async () => {
    const { fs, baselines, restore } = setup({
      [PATHS.presetsFile]: '{"version":1,"presets":[]}',
      [PATHS.claudeSettings]: '{"env":{}}',
    })
    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])
    fs.files().set(PATHS.claudeSettings, '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-app"}}')

    await restore.execute()

    expect(fs.files().get(PATHS.presetsFile)).toBe('{"version":1,"presets":[]}')
    await expect(baselines.readCaptured('claude-code', PATHS.claudeSettings)).resolves.toBe(
      '{"env":{}}'
    )
  })

  it('model_catalog_json 指向托管 models.json 时被剥离', async () => {
    const catalogPath = `${MEMORY_HOME}/${PATHS.codexModels}`
    const { fs, restore } = setup({
      [PATHS.codexConfig]: `model = "glm-4.6"\nmodel_provider = "jake_current"\nmodel_catalog_json = "${catalogPath}"\n`,
    })

    const result = await restore.execute()

    expect(result.allSucceeded).toBe(true)
    const config = fs.files().get(PATHS.codexConfig) ?? ''
    expect(config).not.toContain('model_catalog_json')
    expect(config).not.toContain('glm-4.6')
  })
})
