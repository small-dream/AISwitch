import { describe, expect, it } from 'vitest'

import { presetInputFromPreset } from '@/domain/rules/duplicate-preset'
import { makePreset } from '../../helpers/make-preset'

describe('presetInputFromPreset', () => {
  it('复制全部可编辑字段，默认名带副本后缀，不含 id 与时间戳', () => {
    const preset = makePreset({
      id: 'preset-1',
      name: 'GLM-4.6',
      smallFastModel: 'glm-4.6-air',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    })

    expect(presetInputFromPreset(preset)).toEqual({
      tool: 'claude-code',
      name: 'GLM-4.6 副本',
      providerName: '智谱 GLM',
      baseUrl: 'https://open.bigmodel.cn/api/anthropic',
      apiKey: 'sk-test-key',
      model: 'glm-4.6',
      smallFastModel: 'glm-4.6-air',
      modelMetadata: undefined,
    })
  })

  it('codex 预设复制保留 modelMetadata 且与原对象独立（深拷贝）', () => {
    const metadata = {
      models: [{ slug: 'deepseek-v4-flash', context_window: 1048576 }],
    }
    const preset = makePreset({
      tool: 'codex',
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/',
      modelMetadata: metadata,
    })

    const draft = presetInputFromPreset(preset)
    expect(draft.modelMetadata).toEqual(metadata)
    expect(draft.modelMetadata).not.toBe(metadata)
    const models = draft.modelMetadata?.models
    if (Array.isArray(models)) {
      expect(models[0]).not.toBe(metadata.models[0])
    }
  })

  it('可选字段为空时复制为 undefined，不携带原预设的缺失标记', () => {
    const preset = makePreset({ baseUrl: undefined, smallFastModel: undefined })
    expect(presetInputFromPreset(preset)).toMatchObject({
      baseUrl: undefined,
      smallFastModel: undefined,
    })
  })
})
