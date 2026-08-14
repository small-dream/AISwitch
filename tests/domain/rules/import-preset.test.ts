import { describe, expect, it } from 'vitest'

import { CLAUDE_ENV_KEYS, CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import { claudePresetInputFrom, codexPresetInputFrom } from '@/domain/rules/import-preset'

describe('claudePresetInputFrom', () => {
  it('从 env 生成草稿，名称/供应商取自 base host', () => {
    const input = claudePresetInputFrom({
      env: {
        [CLAUDE_ENV_KEYS.authToken]: 'sk-tok',
        [CLAUDE_ENV_KEYS.model]: 'glm-4.6',
        [CLAUDE_ENV_KEYS.baseUrl]: 'https://relay.example.com/api',
        OTHER: 'keep',
      },
    })
    expect(input).toMatchObject({
      tool: 'claude-code',
      name: 'glm-4.6',
      providerName: 'relay.example.com',
      baseUrl: 'https://relay.example.com/api',
      apiKey: 'sk-tok',
      model: 'glm-4.6',
    })
  })

  it('官方配置：无 baseUrl，供应商显示官方 API', () => {
    const input = claudePresetInputFrom({
      env: { [CLAUDE_ENV_KEYS.authToken]: 'sk', [CLAUDE_ENV_KEYS.model]: 'claude-x' },
    })
    expect(input?.baseUrl).toBeUndefined()
    expect(input?.providerName).toBe('官方 API')
  })

  it('无可识别键 → null', () => {
    expect(claudePresetInputFrom({ env: { OTHER: 'x' } })).toBeNull()
    expect(claudePresetInputFrom({})).toBeNull()
  })
})

describe('codexPresetInputFrom', () => {
  const injected = CODEX_CONFIG_KEYS.injectedProvider

  it('注入供应商场景：取 jake_current 的 base_url 与 auth 的 key', () => {
    const input = codexPresetInputFrom(
      {
        model: 'glm-4.6',
        model_provider: injected,
        model_providers: { [injected]: { base_url: 'https://relay.example.com/v1' } },
      },
      { OPENAI_API_KEY: 'sk-cx' }
    )
    expect(input).toMatchObject({
      tool: 'codex',
      baseUrl: 'https://relay.example.com/v1',
      apiKey: 'sk-cx',
      providerName: 'relay.example.com',
    })
  })

  it('官方场景：baseUrl 为空', () => {
    const input = codexPresetInputFrom(
      { model: 'gpt-5.2', model_provider: 'openai' },
      { OPENAI_API_KEY: 'sk' }
    )
    expect(input?.baseUrl).toBeUndefined()
    expect(input?.providerName).toBe('OpenAI 官方')
  })

  it('无任何可识别信息 → null', () => {
    expect(codexPresetInputFrom({}, null)).toBeNull()
  })
})
