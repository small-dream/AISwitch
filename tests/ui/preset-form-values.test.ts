import { describe, expect, it } from 'vitest'

import type { PresetFormValues } from '@/ui/features/preset-form/preset-form-schema'
import { toFormValues, toPresetInput } from '@/ui/features/preset-form/preset-form-values'
import { makePreset, makePresetInput } from '../helpers/make-preset'

function values(overrides: Partial<PresetFormValues> = {}): PresetFormValues {
  return { ...toFormValues(null, makePresetInput(), 'claude-code'), ...overrides }
}

describe('toFormValues', () => {
  it('编辑预设回填模型与供应商（表单不含认证方式字段）', () => {
    const preset = makePreset({ model: 'glm-4.6', providerName: '智谱 GLM' })

    expect(toFormValues(preset, null, 'claude-code')).toMatchObject({
      model: 'glm-4.6',
      providerName: '智谱 GLM',
    })
  })

  it('新建草稿按当前工具预填空值', () => {
    expect(toFormValues(null, null, 'codex')).toMatchObject({ tool: 'codex', name: '' })
  })
})

describe('toPresetInput', () => {
  it('归一化空串为 undefined，保留模型与供应商名', () => {
    const input = toPresetInput(
      values({
        baseUrl: '',
        apiKey: '',
        model: 'claude-sonnet-5',
      })
    )

    expect(input.baseUrl).toBeUndefined()
    expect(input.apiKey).toBeUndefined()
    expect(input.model).toBe('claude-sonnet-5')
    expect(input.providerName).toBe('智谱 GLM')
  })
})
