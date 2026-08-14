import { describe, expect, it } from 'vitest'

import { CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import { codexProviderLabel, mergeCodexAuth, mergeCodexConfig } from '@/domain/rules/codex-merge'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import { makePreset } from '../../helpers/make-preset'

const CURRENT: CodexConfig = {
  model: 'gpt-5.2-codex',
  model_provider: 'openai',
  model_providers: { openai: { name: 'OpenAI', wire_api: 'responses' } },
}

describe('mergeCodexConfig', () => {
  it('第三方供应商：注入 jake_current 块并指向它，保留既有 provider', () => {
    const preset = makePreset({ tool: 'codex', baseUrl: 'https://relay.example.com/v1' })
    const merged = mergeCodexConfig(CURRENT, preset)
    const injected = CODEX_CONFIG_KEYS.injectedProvider

    expect(merged.model).toBe(preset.model)
    expect(merged.model_provider).toBe(injected)
    expect(merged.model_providers?.[injected]?.name).toBe(preset.providerName)
    expect(merged.model_providers?.[injected]?.base_url).toBe(preset.baseUrl)
    expect(merged.model_providers?.[injected]?.wire_api).toBe('responses')
    expect(merged.model_providers?.[injected]?.experimental_bearer_token).toBe(preset.apiKey)
    expect(merged.model_providers?.openai).toEqual({ name: 'OpenAI', wire_api: 'responses' })
  })

  it('官方 API：移除注入块并指向 openai', () => {
    const preset = makePreset({ tool: 'codex', baseUrl: undefined })
    const seeded: CodexConfig = {
      ...CURRENT,
      model_providers: {
        ...CURRENT.model_providers,
        [CODEX_CONFIG_KEYS.injectedProvider]: { base_url: 'https://relay.example.com/v1' },
      },
    }
    const merged = mergeCodexConfig(seeded, preset)

    expect(merged.model_provider).toBe('openai')
    expect(merged.model_providers?.[CODEX_CONFIG_KEYS.injectedProvider]).toBeUndefined()
  })
})

describe('mergeCodexAuth', () => {
  it('覆盖 OPENAI_API_KEY 并保留未知字段', () => {
    const preset = makePreset({ tool: 'codex', apiKey: 'sk-new' })
    const merged = mergeCodexAuth({ OPENAI_API_KEY: 'sk-old', Tokens: [] }, preset)

    expect(merged.OPENAI_API_KEY).toBe('sk-new')
    expect(merged.Tokens).toEqual([])
  })

  it('非对象基线按空对象处理', () => {
    const preset = makePreset({ tool: 'codex' })
    expect(mergeCodexAuth(null, preset)).toEqual({ OPENAI_API_KEY: preset.apiKey })
  })
})

describe('codexProviderLabel', () => {
  it('注入供应商显示 base_url；指向块优先显示 name；无 name 显示 id；未设置有兜底', () => {
    const injected = CODEX_CONFIG_KEYS.injectedProvider
    expect(
      codexProviderLabel({
        model_provider: injected,
        model_providers: { [injected]: { base_url: 'https://relay.example.com' } },
      })
    ).toBe('https://relay.example.com')
    expect(
      codexProviderLabel({
        model_provider: 'deepseek',
        model_providers: { deepseek: { name: 'deepseek', base_url: 'https://api.deepseek.com/' } },
      })
    ).toBe('deepseek')
    expect(codexProviderLabel({ model_provider: 'openai' })).toBe('openai')
    expect(codexProviderLabel({})).toBe('未设置')
  })
})
