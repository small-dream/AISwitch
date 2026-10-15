import { describe, expect, it } from 'vitest'

import { CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import {
  codexProviderLabel,
  mergeCodexAuth,
  mergeCodexConfig,
  stripManagedCodexAuth,
  stripManagedCodexConfig,
} from '@/domain/rules/codex-merge'
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

  it('apiKey 为空（本地模型）时删除 OPENAI_API_KEY，保留其余字段', () => {
    const preset = makePreset({ tool: 'codex', apiKey: undefined })
    const merged = mergeCodexAuth({ OPENAI_API_KEY: 'sk-old', Tokens: [] }, preset)

    expect('OPENAI_API_KEY' in merged).toBe(false)
    expect(merged.Tokens).toEqual([])
  })
})

describe('mergeCodexConfig · 本地模型（无 Key）', () => {
  it('baseUrl 存在而 Key 为空：注入块不写 experimental_bearer_token 键（PRD §5.9）', () => {
    const injected = CODEX_CONFIG_KEYS.injectedProvider
    const preset = makePreset({
      tool: 'codex',
      baseUrl: 'http://127.0.0.1:11434',
      apiKey: undefined,
    })
    const merged = mergeCodexConfig(CURRENT, preset)
    const block = merged.model_providers?.[injected]

    expect(block).toBeDefined()
    expect(block && 'experimental_bearer_token' in block).toBe(false)
    expect(merged.model_provider).toBe(injected)
  })

  it('Key 为空时连同既有注入块的旧 token 一并删除', () => {
    const injected = CODEX_CONFIG_KEYS.injectedProvider
    const seeded: CodexConfig = {
      ...CURRENT,
      model_providers: {
        ...CURRENT.model_providers,
        [injected]: {
          base_url: 'http://127.0.0.1:11434',
          experimental_bearer_token: 'sk-stale',
        },
      },
    }
    const preset = makePreset({
      tool: 'codex',
      baseUrl: 'http://127.0.0.1:11434',
      apiKey: undefined,
    })
    const merged = mergeCodexConfig(seeded, preset)
    const block = merged.model_providers?.[injected]

    expect(block && 'experimental_bearer_token' in block).toBe(false)
  })

  it('Key 非空：注入块写入该 token', () => {
    const injected = CODEX_CONFIG_KEYS.injectedProvider
    const preset = makePreset({ tool: 'codex', baseUrl: 'https://relay.example.com/v1' })
    const merged = mergeCodexConfig(CURRENT, preset)

    expect(merged.model_providers?.[injected]?.experimental_bearer_token).toBe('sk-test-key')
  })
})

describe('stripManagedCodexConfig', () => {
  const injected = CODEX_CONFIG_KEYS.injectedProvider
  const managedCatalogPath = 'C:/Users/tester/.codex/models.json'

  it('删除托管键与注入块，保留用户自有 provider 与顶层字段', () => {
    const merged = mergeCodexConfig(
      CURRENT,
      makePreset({ tool: 'codex', baseUrl: 'https://relay.example.com/v1' })
    )
    const stripped = stripManagedCodexConfig(merged, managedCatalogPath)

    expect(stripped.model).toBeUndefined()
    expect(stripped.model_provider).toBeUndefined()
    expect(stripped.model_providers?.[injected]).toBeUndefined()
    expect(stripped.model_providers?.openai).toEqual({ name: 'OpenAI', wire_api: 'responses' })
  })

  it('model_catalog_json 仅在指向托管 models.json 时删除', () => {
    const config: CodexConfig = {
      ...CURRENT,
      model_catalog_json: managedCatalogPath,
    }
    expect(stripManagedCodexConfig(config, managedCatalogPath).model_catalog_json).toBeUndefined()

    const userOwned: CodexConfig = { ...CURRENT, model_catalog_json: 'C:/elsewhere/models.json' }
    expect(stripManagedCodexConfig(userOwned, managedCatalogPath).model_catalog_json).toBe(
      'C:/elsewhere/models.json'
    )
  })

  it('model_providers 剥空后移除键本身', () => {
    const onlyInjected: CodexConfig = {
      model_provider: injected,
      model_providers: { [injected]: { base_url: 'https://relay.example.com/v1' } },
    }
    expect('model_providers' in stripManagedCodexConfig(onlyInjected, managedCatalogPath)).toBe(
      false
    )
  })
})

describe('stripManagedCodexAuth', () => {
  it('删除 OPENAI_API_KEY 并保留其他字段', () => {
    expect(stripManagedCodexAuth({ OPENAI_API_KEY: 'sk-x', Tokens: [] })).toEqual({ Tokens: [] })
  })

  it('剥空返回 null（调用方按应用创建语义删除文件）；非对象同样处理', () => {
    expect(stripManagedCodexAuth({ OPENAI_API_KEY: 'sk-x' })).toBeNull()
    expect(stripManagedCodexAuth('junk')).toBeNull()
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

describe('官方订阅（走登录，PRD §5.13）', () => {
  const SUBSCRIPTION = makePreset({
    tool: 'codex',
    authMode: 'subscription',
    baseUrl: undefined,
    apiKey: undefined,
    model: 'gpt-5.6',
  })

  it('mergeCodexConfig：切回官方 provider 并移除注入块', () => {
    const current: CodexConfig = {
      model: 'glm-4.6',
      model_provider: 'jake_current',
      model_providers: {
        jake_current: { base_url: 'https://open.bigmodel.cn/api', name: 'GLM' },
        deepseek: { base_url: 'https://api.deepseek.com/' },
      },
    }

    const merged = mergeCodexConfig(current, SUBSCRIPTION)

    expect(merged.model).toBe('gpt-5.6')
    expect(merged.model_provider).toBe('openai')
    expect(merged.model_providers?.jake_current).toBeUndefined()
    expect(merged.model_providers?.deepseek).toBeDefined()
  })

  it('mergeCodexConfig：订阅预设即便携带 baseUrl 也不注入第三方块', () => {
    const merged = mergeCodexConfig({}, {
      ...SUBSCRIPTION,
      baseUrl: 'https://relay.example.com',
    })

    expect(merged.model_provider).toBe('openai')
    expect(merged.model_providers?.jake_current).toBeUndefined()
  })

  it('mergeCodexAuth：删除 OPENAI_API_KEY 但保留 ChatGPT tokens', () => {
    const merged = mergeCodexAuth(
      { OPENAI_API_KEY: 'sk-old', tokens: { access_token: 'a' } },
      { ...SUBSCRIPTION, apiKey: 'sk-typed' }
    )

    expect('OPENAI_API_KEY' in merged).toBe(false)
    expect(merged.tokens).toEqual({ access_token: 'a' })
  })
})
