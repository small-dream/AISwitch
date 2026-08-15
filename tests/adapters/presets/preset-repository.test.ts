import { describe, expect, it } from 'vitest'

import { PresetRepository } from '@/adapters/presets/preset-repository'
import { PATHS } from '@/constants/paths'
import type { PresetCollection } from '@/domain/entities/preset'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'
import { makePreset } from '../../helpers/make-preset'

function collectionOf(): PresetCollection {
  return { version: 1, presets: [makePreset()] }
}

describe('PresetRepository 权限收紧', () => {
  it('save：先收紧 .aiswitch 目录（0700）再原子写 presets.json', async () => {
    const fs = createMemoryFs()
    const repo = new PresetRepository(fs)

    await repo.save(collectionOf())

    // appDir 收紧在 presetsFile 的 tmp/目标收紧之前
    expect(fs.restricted()[0]).toBe(PATHS.appDir)
    expect(fs.restricted()).toContain(PATHS.presetsFile)
  })

  it('load：读取成功后 best-effort 收紧目录与历史文件权限', async () => {
    const fs = createMemoryFs()
    const repo = new PresetRepository(fs)
    await repo.save(collectionOf())
    fs.restricted().length = 0

    await repo.load()

    expect(fs.restricted()).toEqual([PATHS.appDir, PATHS.presetsFile])
  })

  it('load：收紧失败不阻断加载（仅告警）', async () => {
    const fs = createMemoryFs()
    const repo = new PresetRepository(fs)
    await repo.save(collectionOf())
    const warned: unknown[] = []
    const origWarn = console.warn
    console.warn = (...args: unknown[]) => warned.push(args)
    try {
      const failing: MemoryFs = {
        ...fs,
        async restrictPermissions(path) {
          if (path === PATHS.presetsFile) {
            throw new Error('EACCES')
          }
          return fs.restrictPermissions(path)
        },
      }
      const collection = await new PresetRepository(failing).load()
      expect(collection.presets).toHaveLength(1)
      expect(warned).toHaveLength(1)
    } finally {
      console.warn = origWarn
    }
  })
})
