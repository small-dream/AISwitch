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
