import { describe, expect, it } from 'vitest'

import { PresetRepository } from '@/adapters/presets/preset-repository'
import { PATHS } from '@/constants/paths'
import { makePreset } from '../../helpers/make-preset'
import { createMemoryFs } from '../../helpers/memory-fs'

describe('PresetRepository', () => {
  it('文件不存在时返回空集合', async () => {
    const repo = new PresetRepository(createMemoryFs())
    expect(await repo.load()).toEqual({ version: 1, presets: [] })
  })

  it('save 后可原样 load 回来', async () => {
    const fs = createMemoryFs()
    const repo = new PresetRepository(fs)
    const preset = makePreset()

    await repo.save({ version: 1, presets: [preset] })
    expect(await repo.load()).toEqual({ version: 1, presets: [preset] })
    expect(fs.files().has(PATHS.presetsFile)).toBe(true)
  })

  it('非法 JSON 抛出 E_CONFIG_PARSE', async () => {
    const fs = createMemoryFs({ [PATHS.presetsFile]: '{broken' })
    const repo = new PresetRepository(fs)

    await expect(repo.load()).rejects.toMatchObject({ code: 'E_CONFIG_PARSE' })
  })

  it('结构不符合 Schema 抛出 E_CONFIG_PARSE', async () => {
    const fs = createMemoryFs({ [PATHS.presetsFile]: '{"version": 2, "presets": []}' })
    const repo = new PresetRepository(fs)

    await expect(repo.load()).rejects.toMatchObject({ code: 'E_CONFIG_PARSE' })
  })
})
