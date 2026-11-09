import { describe, expect, it } from 'vitest'

import { BackupManager } from '@/adapters/backup/backup-manager'
import { BaselineManager } from '@/adapters/baseline/baseline-manager'
import { PATHS } from '@/constants/paths'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'

const ORIGINAL = '{"env":{"OTHER_KEY":"keep-me"}}'

function setup(initial: Record<string, string> = {}) {
  const fs = createMemoryFs(initial)
  const backups = new BackupManager(fs)
  const baselines = new BaselineManager(fs, backups)
  return { fs, backups, baselines }
}

describe('BaselineManager 捕获', () => {
  it('基线目录完全不存在时首次捕获自动建目并成功（writeTextFile 不创建父目录）', async () => {
    const { fs, baselines } = setup({ [PATHS.claudeSettings]: ORIGINAL })
    expect(await fs.exists(PATHS.baselineDir)).toBe(false)

    const captured = await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])

    expect(captured).toBe(true)
    const manifest = await baselines.manifest()
    expect(manifest.tools['claude-code']?.files[PATHS.claudeSettings]?.status).toBe('captured')
    await expect(baselines.readCaptured('claude-code', PATHS.claudeSettings)).resolves.toBe(
      ORIGINAL
    )
  })

  it('文件存在且无历史备份 → captured 并保存内容副本', async () => {
    const { baselines } = setup({ [PATHS.claudeSettings]: ORIGINAL })

    const captured = await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])

    expect(captured).toBe(true)
    const manifest = await baselines.manifest()
    expect(manifest.tools['claude-code']?.files[PATHS.claudeSettings]).toMatchObject({
      status: 'captured',
    })
    expect(manifest.tools['claude-code']?.dirExisted).toBe(true)
    await expect(baselines.readCaptured('claude-code', PATHS.claudeSettings)).resolves.toBe(
      ORIGINAL
    )
  })

  it('文件不存在 → absent（应用将来创建，还原时删除）', async () => {
    const { baselines } = setup()

    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])

    const manifest = await baselines.manifest()
    expect(manifest.tools['claude-code']?.files[PATHS.claudeSettings]?.status).toBe('absent')
    expect(manifest.tools['claude-code']?.dirExisted).toBe(false)
  })

  it('文件存在但有历史备份（升级前旧切换）→ degraded 且不再落明文副本', async () => {
    const { fs, backups, baselines } = setup({ [PATHS.claudeSettings]: ORIGINAL })
    await backups.backup('claude-code', PATHS.claudeSettings)

    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])

    const manifest = await baselines.manifest()
    expect(manifest.tools['claude-code']?.files[PATHS.claudeSettings]?.status).toBe('degraded')
    expect(fs.files().has(`${PATHS.baselineDir}/claude-code/settings.json`)).toBe(false)
  })

  it('幂等：已捕获的工具不重复捕获', async () => {
    const { baselines } = setup({ [PATHS.claudeSettings]: ORIGINAL })

    expect(await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])).toBe(true)
    expect(await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])).toBe(false)
  })
})

describe('BaselineManager 权限与隔离', () => {
  it('捕获后收紧目录与副本权限（含明文密钥场景）', async () => {
    const { fs, baselines } = setup({ [PATHS.claudeSettings]: ORIGINAL })
    fs.restricted().length = 0

    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])

    expect(fs.restricted()).toContain(PATHS.baselineDir)
    expect(fs.restricted()).toContain(`${PATHS.baselineDir}/claude-code/settings.json`)
    expect(fs.restricted()).toContain(`${PATHS.baselineDir}/manifest.json`)
  })

  it('基线目录独立于 backups，不受滚动清理影响', async () => {
    const { backups, baselines } = setup({ [PATHS.claudeSettings]: ORIGINAL })
    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])

    // prune 只作用于 backups 目录；基线副本仍在
    await backups.backup('claude-code', PATHS.claudeSettings)
    await expect(baselines.readCaptured('claude-code', PATHS.claudeSettings)).resolves.toBe(
      ORIGINAL
    )
  })
})

describe('BaselineManager 健壮性', () => {
  it('空受管文件清单 → 抛 E_BASELINE_FAILED（基线不允许无锚点捕获）', async () => {
    const { baselines } = setup()

    await expect(baselines.captureIfAbsent('claude-code', [])).rejects.toMatchObject({
      code: 'E_BASELINE_FAILED',
    })
  })

  it('manifest 损坏抛 E_BASELINE_FAILED（还原不允许基于可疑清单行动）', async () => {
    const fs: MemoryFs = createMemoryFs({
      [`${PATHS.baselineDir}/manifest.json`]: '{not-json',
    })
    const baselines = new BaselineManager(fs, new BackupManager(fs))

    await expect(baselines.manifest()).rejects.toMatchObject({ code: 'E_BASELINE_FAILED' })
  })
})

describe('BaselineManager 并发', () => {
  it('并发首次捕获两个工具：两边条目都保留（manifest 读-改-写串行）', async () => {
    const { baselines } = setup({
      [PATHS.claudeSettings]: ORIGINAL,
      [PATHS.codexConfig]: 'model = "gpt-5"\n',
    })

    await Promise.all([
      baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings]),
      baselines.captureIfAbsent('codex', [PATHS.codexConfig]),
    ])

    const manifest = await baselines.manifest()
    expect(manifest.tools['claude-code']).toBeDefined()
    expect(manifest.tools.codex).toBeDefined()
  })
})

describe('BaselineManager 写入证据', () => {
  it('markWritten：标记为应用写过，且重复调用幂等', async () => {
    const { baselines } = setup()
    await baselines.captureIfAbsent('claude-code', [PATHS.claudeSettings])

    await baselines.markWritten('claude-code', [PATHS.claudeSettings])
    const first = await baselines.manifest()
    expect(first.tools['claude-code']?.files[PATHS.claudeSettings]?.written).toBe(true)

    await baselines.markWritten('claude-code', [PATHS.claudeSettings])
    const second = await baselines.manifest()
    expect(second).toEqual(first)
  })

  it('markWritten：未捕获基线的工具不凭空造记录', async () => {
    const { baselines } = setup()

    await baselines.markWritten('codex', [PATHS.codexConfig])

    expect((await baselines.manifest()).tools.codex).toBeUndefined()
  })

  it('markWritten：只标记本次实际改写的文件', async () => {
    const { baselines } = setup()
    await baselines.captureIfAbsent('codex', [PATHS.codexConfig, PATHS.codexAuth])

    await baselines.markWritten('codex', [PATHS.codexConfig])

    const manifest = await baselines.manifest()
    expect(manifest.tools.codex?.files[PATHS.codexConfig]?.written).toBe(true)
    expect(manifest.tools.codex?.files[PATHS.codexAuth]?.written).toBeUndefined()
  })
})
