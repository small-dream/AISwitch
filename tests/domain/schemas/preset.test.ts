import { describe, expect, it } from 'vitest'

import { presetCollectionSchema, presetSchema } from '@/domain/schemas/preset'
import { makePreset } from '../../helpers/make-preset'

describe('presetSchema · 未知字段兼容', () => {
  it('遗留 wireApi 字段（未发布版本曾写过）被剥离而非报错', () => {
    // 该字段曾在未发布版本中短暂存在，部分用户数据仍带有它；
    // Codex 已移除 chat 协议，字段随之作废，读取时必须容错而非让整份预设库解析失败。
    const legacy = { ...makePreset({ tool: 'codex' }), wireApi: 'chat' }
    const parsed = presetSchema.safeParse(legacy)

    expect(parsed.success).toBe(true)
    expect(parsed.success ? 'wireApi' in parsed.data : true).toBe(false)
  })

  it('含遗留字段的整份预设库仍可读取并保留其他预设', () => {
    const collection = {
      version: 1,
      presets: [
        { ...makePreset({ tool: 'codex', name: '带遗留字段' }), wireApi: 'chat' },
        makePreset({ id: 'preset-2', name: '正常预设' }),
      ],
    }
    const parsed = presetCollectionSchema.safeParse(collection)

    expect(parsed.success).toBe(true)
    expect(parsed.success ? parsed.data.presets.map((item) => item.name) : []).toEqual([
      '带遗留字段',
      '正常预设',
    ])
  })
})
