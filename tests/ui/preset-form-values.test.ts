import { describe, expect, it } from 'vitest'

import type { PresetFormValues } from '@/ui/features/preset-form/preset-form-schema'
import { toFormValues, toPresetInput } from '@/ui/features/preset-form/preset-form-values'
import { makePreset, makePresetInput } from '../helpers/make-preset'

function values(overrides: Partial<PresetFormValues> = {}): PresetFormValues {
  return { ...toFormValues(null, makePresetInput(), 'claude-code'), ...overrides }
}

describe('toFormValues', () => {
  it('订阅预设回填订阅认证方式', () => {
    const preset = makePreset({ authMode: 'subscription', baseUrl: undefined, apiKey: undefined })

    expect(toFormValues(preset, null, 'claude-code').authMode).toBe('subscription')
  })

  it('新建草稿默认 API Key 模式', () => {
    expect(toFormValues(null, null, 'codex')).toMatchObject({ authMode: 'api-key', tool: 'codex' })
  })
})

describe('toPresetInput · 官方订阅', () => {
  it('丢弃 Base URL 与 API Key，保留模型与供应商名', () => {
    const input = toPresetInput(
      values({
        authMode: 'subscription',
        baseUrl: 'https://relay.example.com',
        apiKey: 'sk-typed',
        model: 'claude-sonnet-5',
      })
    )

    expect(input).toMatchObject({
      authMode: 'subscription',
      baseUrl: undefined,
      apiKey: undefined,
      model: 'claude-sonnet-5',
      providerName: '智谱 GLM',
    })
  })

  it('API Key 模式照常归一化空串为 undefined', () => {
    const input = toPresetInput(values({ authMode: 'api-key', baseUrl: '', apiKey: '' }))

    expect(input.baseUrl).toBeUndefined()
    expect(input.apiKey).toBeUndefined()
  })
})
