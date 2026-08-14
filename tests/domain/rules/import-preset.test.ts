import { describe, expect, it } from 'vitest'

import { CLAUDE_ENV_KEYS, CLAUDE_SLOT_KEYS, CODEX_CONFIG_KEYS } from '@/constants/config-keys'
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

  it('真实中转场景：无 ANTHROPIC_MODEL 时从槽位键读取模型', () => {
    const input = claudePresetInputFrom({
      env: {
        [CLAUDE_ENV_KEYS.authToken]: 'sk-tok',
        [CLAUDE_ENV_KEYS.baseUrl]: 'https://open.bigmodel.cn/api/anthropic',
        [CLAUDE_SLOT_KEYS.haiku]: 'glm-4.5-air',
        [CLAUDE_SLOT_KEYS.sonnet]: 'glm-5.2[1m]',
        [CLAUDE_SLOT_KEYS.opus]: 'glm-5.2[1m]',
      },
    })
    expect(input?.model).toBe('glm-5.2[1m]')
    expect(input?.name).toBe('glm-5.2[1m]')
    expect(input?.providerName).toBe('open.bigmodel.cn')
  })

  it('兜底到 Claude Code 原生顶层 model 字段', () => {
    const input = claudePresetInputFrom({ model: 'claude-sonnet-4-5' })
    expect(input?.model).toBe('claude-sonnet-4-5')
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

  it('供应商名优先取指向块内的 name 字段', () => {
    const input = codexPresetInputFrom(
      {
        model: 'm1',
        model_provider: 'myrelay',
        model_providers: { myrelay: { name: '我的中转', base_url: 'https://r.example.com/v1' } },
      },
      { OPENAI_API_KEY: 'sk' }
    )
    expect(input?.providerName).toBe('我的中转')
  })
})

describe('codexPresetInputFrom · 真实 DeepSeek 场景', () => {
  it('DeepSeek 官方脚本配置：供应商与 Key 均取自指向块（块内 token 优先于 auth.json）', () => {
    const input = codexPresetInputFrom(
      {
        model: 'deepseek-v4-flash',
        model_provider: 'deepseek',
        model_providers: {
          deepseek: {
            name: 'deepseek',
            base_url: 'https://api.deepseek.com/',
            experimental_bearer_token: 'sk-ds-token',
          },
          custom: { name: 'yunwu', base_url: 'https://yunwu.ai/v1' },
        },
      },
      { OPENAI_API_KEY: 'sk-stale-from-yunwu' }
    )
    expect(input).toMatchObject({
      tool: 'codex',
      model: 'deepseek-v4-flash',
      providerName: 'deepseek',
      baseUrl: 'https://api.deepseek.com/',
      apiKey: 'sk-ds-token',
    })
  })

  it('指向块缺失时不猜测其他块，供应商按 id 展示', () => {
    const input = codexPresetInputFrom(
      {
        model: 'm1',
        model_provider: 'gone',
        model_providers: { custom: { name: 'yunwu', base_url: 'https://yunwu.ai/v1' } },
      },
      { OPENAI_API_KEY: 'sk' }
    )
    expect(input?.baseUrl).toBeUndefined()
    expect(input?.providerName).toBe('gone')
  })
})

describe('codexPresetInputFrom · Key 回退与边界', () => {
  it('指向块无内嵌 token 时回退 auth.json 的 OPENAI_API_KEY', () => {
    const input = codexPresetInputFrom(
      {
        model: 'm1',
        model_provider: 'myrelay',
        model_providers: { myrelay: { name: '我的中转', base_url: 'https://r.example.com/v1' } },
      },
      { OPENAI_API_KEY: 'sk-auth' }
    )
    expect(input?.apiKey).toBe('sk-auth')
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
