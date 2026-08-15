import { describe, expect, it } from 'vitest'

import { BackupManager } from '@/adapters/backup/backup-manager'
import { PATHS } from '@/constants/paths'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'

describe('BackupManager 权限收紧', () => {
  it('backup：逐层收紧目录与备份文件（含明文密钥）', async () => {
    const fs = createMemoryFs({
      [PATHS.claudeSettings]: '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-secret"}}',
    })
    const backups = new BackupManager(fs)

    const name = await backups.backup('claude-code', PATHS.claudeSettings)

    expect(name).toBeTruthy()
    if (!name) {
      throw new Error('backup 应返回备份名')
    }
    expect(fs.restricted()).toEqual([
      PATHS.appDir,
      PATHS.backupsDir,
      `${PATHS.backupsDir}/claude-code`,
      `${PATHS.backupsDir}/claude-code/${name}`,
    ])
  })

  it('backup：权限收紧失败抛 E_FS_PERMISSION', async () => {
    const fs: MemoryFs = createMemoryFs({
      [PATHS.claudeSettings]: '{"env":{}}',
    })
    const failing: MemoryFs = {
      ...fs,
      async restrictPermissions(path) {
        if (path === PATHS.appDir) {
          throw new Error('EACCES')
        }
        return fs.restrictPermissions(path)
      },
    }

    await expect(
      new BackupManager(failing).backup('claude-code', PATHS.claudeSettings)
    ).rejects.toMatchObject({ code: 'E_FS_PERMISSION' })
  })

  it('backup：best-effort 治愈同目录下历史遗留的备份文件权限', async () => {
    const legacy = `${PATHS.backupsDir}/claude-code/20260101-000000--settings.json`
    const fs = createMemoryFs({
      [PATHS.claudeSettings]: '{"env":{}}',
      [legacy]: '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-old"}}',
    })
    fs.restricted().length = 0

    await new BackupManager(fs).backup('claude-code', PATHS.claudeSettings)

    expect(fs.restricted()).toContain(legacy)
  })
})
