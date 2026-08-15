import { describe, expect, it } from 'vitest'

import {
  backupFileName,
  earliestBackupName,
  formatBackupTimestamp,
  latestBackupName,
  namesToPrune,
  parseBackupName,
} from '@/domain/rules/backup-naming'

describe('parseBackupName', () => {
  it('解析时间戳与源文件名', () => {
    expect(parseBackupName('20260814-183000--settings.json')).toEqual({
      timestamp: '20260814-183000',
      basename: 'settings.json',
    })
  })

  it('非法命名返回 null', () => {
    expect(parseBackupName('random.txt')).toBeNull()
    expect(parseBackupName('--settings.json')).toBeNull()
    expect(parseBackupName('2026081-1830--x.json')).toBeNull()
  })
})

describe('formatBackupTimestamp', () => {
  it('生成本地时间戳 yyyyMMdd-HHmmss', () => {
    const date = new Date(2026, 7, 14, 9, 5, 3)
    expect(formatBackupTimestamp(date)).toBe('20260814-090503')
  })
})

describe('backupFileName', () => {
  it('时间戳与文件名以分隔符连接', () => {
    expect(backupFileName('settings.json', new Date(2026, 7, 14, 9, 5, 3))).toBe(
      '20260814-090503--settings.json'
    )
  })
})

describe('latestBackupName', () => {
  it('返回指定文件最新一份备份，忽略其他文件', () => {
    const names = [
      '20260814-090503--auth.json',
      '20260813-080000--settings.json',
      '20260814-100000--settings.json',
      'random.txt',
    ]
    expect(latestBackupName(names, 'settings.json')).toBe('20260814-100000--settings.json')
  })

  it('无匹配备份时返回 null', () => {
    expect(latestBackupName(['random.txt'], 'settings.json')).toBeNull()
  })
})

describe('earliestBackupName', () => {
  it('返回指定文件最早一份备份（一键还原的近似基线）', () => {
    const names = [
      '20260814-100000--settings.json',
      '20260813-080000--settings.json',
      '20260814-090503--auth.json',
    ]
    expect(earliestBackupName(names, 'settings.json')).toBe('20260813-080000--settings.json')
  })

  it('无匹配备份时返回 null', () => {
    expect(earliestBackupName(['random.txt'], 'settings.json')).toBeNull()
  })
})

describe('namesToPrune', () => {
  it('超出保留数量的旧备份被标记清理（新到旧）', () => {
    const names = Array.from(
      { length: 23 },
      (_, i) => `20260801-0000${String(i).padStart(2, '0')}--x`
    )
    const pruned = namesToPrune(names, 20)

    expect(pruned).toEqual(['20260801-000002--x', '20260801-000001--x', '20260801-000000--x'])
  })

  it('未超量时不清理', () => {
    expect(namesToPrune(['a', 'b'])).toEqual([])
  })
})
