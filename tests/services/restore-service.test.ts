import { describe, expect, it } from 'vitest'

import { BackupManager } from '@/adapters/backup/backup-manager'
import { BaselineManager } from '@/adapters/baseline/baseline-manager'
import { restoreFileOps } from '@/adapters/restore/restore-file-ops'
import { PATHS } from '@/constants/paths'
import { RestoreService } from '@/services/restore-service'
import { BackupService } from '@/services/backup-service'
import { createMemoryFs, MEMORY_HOME, type MemoryFs } from '../helpers/memory-fs'

const CODEX_FILES = [PATHS.codexConfig, PATHS.codexAuth, PATHS.codexModels] as const

function setup(initial: Record<string, string> = {}) {
  const fs = createMemoryFs(initial)
  const backupManager = new BackupManager(fs)
  const baselines = new BaselineManager(fs, backupManager)
  const backups = new BackupService(backupManager)
  const restore = new RestoreService({ fs, baselines, backups, ops: restoreFileOps })
  return { fs, backupManager, baselines, backups, restore }
}

function captureCodex(baselines: BaselineManager): Promise<boolean> {
  return baselines.captureIfAbsent('codex', CODEX_FILES)
}

describe('RestoreService.plan', () => {
  it('captured → 精确还原；absent 且应用写过 → 删除', async () => {
    const { fs, baselines, restore } = setup({ [PATHS.claudeSettings]: '{"env":{}}' })
    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])
    await captureCodex(baselines)
    // 模拟切换后：captured 文件被改写、absent 文件被应用创建（并记为应用写过）
    fs.files().set(PATHS.claudeSettings, '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-app"}}')
    fs.files().set(PATHS.codexConfig, 'model = "glm-4.6"')
    await baselines.markWritten('codex', [PATHS.codexConfig])

    const plan = await restore.plan()

    expect(plan.hasBaseline).toBe(true)
    const claude = plan.files.find((item) => item.file === PATHS.claudeSettings)
    expect(claude).toMatchObject({ action: 'restore-baseline', approximate: false })
    const codexConfig = plan.files.find((item) => item.file === PATHS.codexConfig)
    expect(codexConfig).toMatchObject({ action: 'delete', approximate: false })
    expect(fs.files().size).toBeGreaterThan(0)
  })

  it('无基线（老用户）→ 有备份走最早备份（近似），无任何证据时不动用户文件', async () => {
    const { backupManager, restore } = setup({
      [PATHS.claudeSettings]: '{"env":{}}',
      [PATHS.codexAuth]: '{"OPENAI_API_KEY":"sk-x"}',
    })
    await backupManager.backup('claude-code', PATHS.claudeSettings)

    const plan = await restore.plan()

    expect(plan.hasBaseline).toBe(false)
    const claude = plan.files.find((item) => item.file === PATHS.claudeSettings)
    expect(claude).toMatchObject({ action: 'restore-earliest-backup', approximate: true })
    // 该工具没有基线也没有备份：分不清是应用还是用户写的，保守跳过
    const auth = plan.files.find((item) => item.file === PATHS.codexAuth)
    expect(auth).toMatchObject({ action: 'keep', approximate: false })
  })

  it('absent 但应用没写过（CLI 自己创建）→ 保留文件', async () => {
    const { fs, baselines, restore } = setup()
    await captureCodex(baselines)
    // 安装前不存在，随后用户自己 codex login 生成的凭据文件
    fs.files().set(PATHS.codexAuth, '{"tokens":{"access_token":"fresh"}}')

    const plan = await restore.plan()

    expect(plan.files.find((item) => item.file === PATHS.codexAuth)).toMatchObject({
      action: 'keep',
      approximate: false,
    })
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
    await captureCodex(baselines)
    // 模拟切换后应用创建的文件
    fs.files().set(PATHS.codexAuth, '{"OPENAI_API_KEY":"sk-app"}')
    await baselines.markWritten('codex', [PATHS.codexAuth])

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
    await baselines.markWritten('claude-code', [PATHS.claudeSettings])

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
    await captureCodex(baselines)
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
  it('无基线无备份：不碰用户自己维护的配置', async () => {
    const claude = '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-manual","OTHER_KEY":"keep-me"}}'
    const auth = '{"OPENAI_API_KEY":"sk-manual","Tokens":[]}'
    const { fs, restore } = setup({ [PATHS.claudeSettings]: claude, [PATHS.codexAuth]: auth })

    const result = await restore.execute()

    expect(result.allSucceeded).toBe(true)
    expect(fs.files().get(PATHS.claudeSettings)).toBe(claude)
    expect(fs.files().get(PATHS.codexAuth)).toBe(auth)
  })
})

describe('RestoreService.execute 降级剥离与容错', () => {
  it('有基线（degraded）且备份已被清理 → 剥离托管键兜底，用户自有键保留', async () => {
    const backupPath = `${PATHS.backupsDir}/claude-code/20260101-000000--settings.json`
    const { fs, baselines, restore } = setup({
      [backupPath]: '{"env":{"OTHER_KEY":"before"}}',
      [PATHS.claudeSettings]:
        '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-app","ANTHROPIC_MODEL":"glm-4.6","OTHER_KEY":"keep-me"}}',
    })
    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])
    expect(
      (await baselines.manifest()).tools['claude-code']?.files[PATHS.claudeSettings]?.status
    ).toBe('degraded')
    // 备份被滚动清理：精确内容已不可得，退回键级剥离
    fs.files().delete(backupPath)

    const result = await restore.execute()

    expect(result.allSucceeded).toBe(true)
    expect(JSON.parse(fs.files().get(PATHS.claudeSettings) ?? '{}')).toEqual({
      env: { OTHER_KEY: 'keep-me' },
    })
  })

  it('单文件失败不中断，结果如实上报', async () => {
    const base = setup({
      [PATHS.claudeSettings]: '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-app","OTHER_KEY":"keep"}}',
      [PATHS.codexAuth]: '{"OPENAI_API_KEY":"sk-app"}',
    })
    await base.baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])
    await captureCodex(base.baselines)
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
      ops: restoreFileOps,
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
    const backupPath = `${PATHS.backupsDir}/codex/20260101-000000--config.toml`
    const { fs, baselines, restore } = setup({
      [backupPath]: 'model = "before"\n',
      [PATHS.codexConfig]: `model = "glm-4.6"\nmodel_provider = "jake_current"\nmodel_catalog_json = "${catalogPath}"\n`,
    })
    await captureCodex(baselines)
    // 备份已不可用 → 走键级剥离
    fs.files().delete(backupPath)

    const result = await restore.execute()

    expect(result.allSucceeded).toBe(true)
    const config = fs.files().get(PATHS.codexConfig) ?? ''
    expect(config).not.toContain('model_catalog_json')
    expect(config).not.toContain('glm-4.6')
  })
})
