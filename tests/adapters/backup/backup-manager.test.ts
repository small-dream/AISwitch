import { describe, expect, it } from 'vitest'

import { BackupManager } from '@/adapters/backup/backup-manager'
import { createMemoryFs } from '../../helpers/memory-fs'

const DIR = '.jakeaitools/backups/claude-code'

describe('BackupManager', () => {
  it('备份源文件为时间戳副本并返回文件名', async () => {
    const fs = createMemoryFs({ '.claude/settings.json': '{"env":{}}' })
    const manager = new BackupManager(fs)

    const name = await manager.backup('claude-code', '.claude/settings.json')

    expect(name).toMatch(/^\d{8}-\d{6}--settings\.json$/)
    if (!name) {
      throw new Error('应产生备份文件名')
    }
    expect(fs.files().get(`${DIR}/${name}`)).toBe('{"env":{}}')
  })

  it('源文件不存在时返回 null 且不产生备份', async () => {
    const fs = createMemoryFs()
    const manager = new BackupManager(fs)

    expect(await manager.backup('claude-code', '.claude/settings.json')).toBeNull()
    expect(fs.files().size).toBe(0)
  })

  it('超出保留份数时清理最旧备份', async () => {
    const seed: Record<string, string> = {}
    for (let i = 0; i < 22; i++) {
      const stamp = String(i).padStart(4, '0')
      seed[`${DIR}/20260801-${stamp}00--settings.json`] = '{}'
    }
    const fs = createMemoryFs(seed)
    fs.files().set('.claude/settings.json', '{"new":true}')
    const manager = new BackupManager(fs)

    await manager.backup('claude-code', '.claude/settings.json')

    const remaining = [...fs.files().keys()].filter((key) => key.startsWith(`${DIR}/`))
    expect(remaining).toHaveLength(20)
    expect(remaining.some((key) => key.includes('20260801-000000'))).toBe(false)
  })

  it('restoreLatest 恢复最新备份；无备份返回 false', async () => {
    const fs = createMemoryFs({
      [`${DIR}/20260801-010000--settings.json`]: '{"old":1}',
      [`${DIR}/20260802-020000--settings.json`]: '{"new":2}',
    })
    const manager = new BackupManager(fs)

    expect(await manager.restoreLatest('claude-code', '.claude/settings.json')).toBe(true)
    expect(fs.files().get('.claude/settings.json')).toBe('{"new":2}')

    const empty = new BackupManager(createMemoryFs())
    expect(await empty.restoreLatest('claude-code', '.claude/settings.json')).toBe(false)
  })
})
