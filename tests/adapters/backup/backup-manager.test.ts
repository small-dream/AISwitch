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
      `${PATHS.backupsDir}/claude-code/${name}.jake-tmp`,
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

describe('BackupManager 原子写与滚动清理', () => {
  it('backup：原子写落盘不留 tmp，返回备份名且内容完整可读回', async () => {
    const fs = createMemoryFs({
      [PATHS.claudeSettings]: '{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-secret"}}',
    })
    const backups = new BackupManager(fs)

    const name = await backups.backup('claude-code', PATHS.claudeSettings)

    expect(name).toBeTruthy()
    if (!name) {
      throw new Error('backup 应返回备份名')
    }
    const dir = `${PATHS.backupsDir}/claude-code`
    expect(fs.files().get(`${dir}/${name}`)).toBe('{"env":{"ANTHROPIC_AUTH_TOKEN":"sk-secret"}}')
    expect(fs.files().has(`${dir}/${name}.jake-tmp`)).toBe(false)
  })

  it('prune：外来文件不参与保留计数且不被删除', async () => {
    const dir = `${PATHS.backupsDir}/claude-code`
    const seeded: Record<string, string> = { [PATHS.claudeSettings]: '{"env":{}}' }
    for (let i = 0; i < 20; i += 1) {
      seeded[`${dir}/20260101-0000${String(i).padStart(2, '0')}--settings.json`] = `v${String(i)}`
    }
    const foreign = `${dir}/foreign-notes.txt`
    seeded[foreign] = 'do-not-touch'
    const fs = createMemoryFs(seeded)
    const backups = new BackupManager(fs)

    await backups.backup('claude-code', PATHS.claudeSettings)

    // 21 份合法备份超量 → 仅清理最旧 1 份；外来文件原样保留
    expect(fs.files().get(foreign)).toBe('do-not-touch')
    const remaining = [...fs.files().keys()].filter((key) => key.startsWith(`${dir}/`))
    expect(remaining).toHaveLength(21)
    expect(fs.files().has(`${dir}/20260101-000000--settings.json`)).toBe(false)
  })
})
