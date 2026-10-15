import { describe, expect, it } from 'vitest'

import { defaultAuthMode, isSubscriptionAuth, withoutKeyFields } from '@/domain/rules/auth-mode'
import { makePreset, makePresetInput } from '../../helpers/make-preset'

describe('isSubscriptionAuth', () => {
  it('仅 subscription 视为订阅模式', () => {
    expect(isSubscriptionAuth({ authMode: 'subscription' })).toBe(true)
    expect(isSubscriptionAuth({ authMode: 'api-key' })).toBe(false)
  })
})

describe('defaultAuthMode', () => {
  it('无 Base URL 且无 Key 的配置按订阅模式建草稿', () => {
    expect(defaultAuthMode(undefined, undefined)).toBe('subscription')
    expect(defaultAuthMode(undefined, '')).toBe('subscription')
  })

  it('带 Base URL 或 Key 的配置按 API Key 模式建草稿', () => {
    expect(defaultAuthMode('https://relay.example.com', undefined)).toBe('api-key')
    expect(defaultAuthMode(undefined, 'sk-tok')).toBe('api-key')
  })
})

describe('withoutKeyFields', () => {
  it('订阅模式丢弃 baseUrl 与 apiKey，其余字段原样保留', () => {
    const input = makePresetInput({ authMode: 'subscription', model: 'claude-sonnet-5' })

    expect(withoutKeyFields(input)).toEqual({
      ...input,
      baseUrl: undefined,
      apiKey: undefined,
    })
  })

  it('API Key 模式不做任何改写', () => {
    const input = makePresetInput()
    expect(withoutKeyFields(input)).toBe(input)
  })

  it('订阅预设产物不含密钥（切回密钥模式需重新填写）', () => {
    const preset = makePreset({ authMode: 'subscription', baseUrl: undefined, apiKey: undefined })
    expect(withoutKeyFields({ ...preset }).apiKey).toBeUndefined()
  })
})
