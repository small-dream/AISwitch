import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseToml } from 'smol-toml'
import { describe, expect, it } from 'vitest'

import { createCodexTarget } from '@/adapters/codex'
import { CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import { makePreset } from '../../helpers/make-preset'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures')
const CONFIG_FIXTURE = readFileSync(join(FIXTURES, 'codex-config.toml'), 'utf8')
const AUTH_FIXTURE = readFileSync(join(FIXTURES, 'codex-auth.json'), 'utf8')
const INJECTED = CODEX_CONFIG_KEYS.injectedProvider

function seededFs(): MemoryFs {
  return createMemoryFs({
    '.codex/config.toml': CONFIG_FIXTURE,
    '.codex/auth.json': AUTH_FIXTURE,
  })
}

function readToml(fs: MemoryFs): Record<string, unknown> {
  return parseToml(fs.files().get('.codex/config.toml') ?? '')
}

function readProviders(fs: MemoryFs): Record<string, Record<string, unknown>> {
  const providers = readToml(fs).model_providers
  if (typeof providers !== 'object' || providers === null) {
    throw new Error('model_providers 缺失')
  }
  return providers as Record<string, Record<string, unknown>>
}

function readAuth(fs: MemoryFs): Record<string, unknown> {
  return JSON.parse(fs.files().get('.codex/auth.json') ?? '') as Record<string, unknown>
}

describe('CodexConfigTarget · detect', () => {
  it('未检测到全局配置（不判定为未安装，兼容 VS Code 插件场景）', async () => {
    const target = createCodexTarget(createMemoryFs())
    expect(await target.detect()).toEqual({ tool: 'codex', status: 'not-configured' })
  })

  it('读取当前模型与供应商', async () => {
    const target = createCodexTarget(seededFs())
    expect(await target.detect()).toEqual({
      tool: 'codex',
      status: 'installed',
      activeModel: 'gpt-5.2-codex',
      activeProviderName: 'openai',
    })
  })
})

describe('CodexConfigTarget · apply / rollback', () => {
  it('apply：第三方供应商注入 provider 块并保留既有 provider', async () => {
    const fs = seededFs()
    const target = createCodexTarget(fs)
    const preset = makePreset({ tool: 'codex', baseUrl: 'https://relay.example.com/v1' })

    await target.apply(preset)

    const config = readToml(fs)
    expect(config.model).toBe('glm-4.6')
    expect(config.model_provider).toBe(INJECTED)
    expect(readProviders(fs)[INJECTED]?.base_url).toBe('https://relay.example.com/v1')
    expect(readProviders(fs).openai).toEqual({ name: 'OpenAI', wire_api: 'responses' })
  })

  it('apply：同步更新 auth.json 且写后校验通过', async () => {
    const fs = seededFs()
    const target = createCodexTarget(fs)
    const preset = makePreset({ tool: 'codex', baseUrl: 'https://relay.example.com/v1' })

    await target.apply(preset)

    expect(readAuth(fs).OPENAI_API_KEY).toBe('sk-test-key')
    expect(readAuth(fs).Tokens).toEqual([])
    expect(await target.verify(preset)).toBe(true)
  })

  it('apply：官方预设移除注入块并指向 openai', async () => {
    const fs = seededFs()
    const target = createCodexTarget(fs)
    const preset = makePreset({ tool: 'codex', baseUrl: undefined })

    await target.apply(preset)

    const config = readToml(fs)
    expect(config.model_provider).toBe('openai')
    expect(INJECTED in readProviders(fs)).toBe(false)
  })

  it('rollback：恢复两个文件的最近备份', async () => {
    const fs = seededFs()
    const target = createCodexTarget(fs)
    await target.apply(makePreset({ tool: 'codex' }))

    expect(await target.rollback()).toBe(true)
    expect(fs.files().get('.codex/config.toml')).toBe(CONFIG_FIXTURE)
    expect(fs.files().get('.codex/auth.json')).toBe(AUTH_FIXTURE)
  })
})
