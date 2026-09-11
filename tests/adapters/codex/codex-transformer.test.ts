import { parse as parseToml } from 'smol-toml'
import { describe, expect, it } from 'vitest'

import { serializeCodexConfig } from '@/adapters/codex/transformer'
import type { CodexConfig } from '@/domain/schemas/codex-config'

function readProviders(serialized: string): Record<string, Record<string, unknown>> {
  const providers = (parseToml(serialized) as Record<string, unknown>).model_providers
  if (typeof providers !== 'object' || providers === null) {
    throw new Error('model_providers 缺失')
  }
  return providers as Record<string, Record<string, unknown>>
}

describe('serializeCodexConfig', () => {
  it('空串 experimental_bearer_token 不落盘（删除该键而非写空值）', () => {
    const config: CodexConfig = {
      model: 'local-model',
      model_provider: 'jake_current',
      model_providers: {
        jake_current: {
          name: 'Local',
          base_url: 'http://127.0.0.1:11434',
          experimental_bearer_token: '',
        },
      },
    }

    const block = readProviders(serializeCodexConfig(config)).jake_current

    expect(block).toBeDefined()
    expect(block && 'experimental_bearer_token' in block).toBe(false)
    expect(block?.base_url).toBe('http://127.0.0.1:11434')
  })

  it('非空 token 与其他 provider 块正常序列化', () => {
    const config: CodexConfig = {
      model: 'glm-4.6',
      model_provider: 'jake_current',
      model_providers: {
        jake_current: {
          name: '智谱 GLM',
          base_url: 'https://relay.example.com/v1',
          experimental_bearer_token: 'sk-real',
        },
        openai: { name: 'OpenAI', wire_api: 'responses' },
      },
    }

    const providers = readProviders(serializeCodexConfig(config))

    expect(providers.jake_current?.experimental_bearer_token).toBe('sk-real')
    expect(providers.openai).toEqual({ name: 'OpenAI', wire_api: 'responses' })
  })
})
