import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseToml } from 'smol-toml'
import { describe, expect, it } from 'vitest'

import { createCodexTarget } from '@/adapters/codex'
import { CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import { findCatalogEntry } from '@/domain/rules/codex-catalog'
import { makePreset } from '../../helpers/make-preset'
import { createMemoryFs, MEMORY_HOME, type MemoryFs } from '../../helpers/memory-fs'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures')
const CONFIG_FIXTURE = readFileSync(join(FIXTURES, 'codex-config.toml'), 'utf8')
const AUTH_FIXTURE = readFileSync(join(FIXTURES, 'codex-auth.json'), 'utf8')
const MODELS_FIXTURE = readFileSync(join(FIXTURES, 'codex-models.json'), 'utf8')
const INJECTED = CODEX_CONFIG_KEYS.injectedProvider
const MODELS_PATH = '.codex/models.json'
const MANAGED_CATALOG = `${MEMORY_HOME}/.codex/models.json`

function seededFs(files: Record<string, string> = {}): MemoryFs {
  return createMemoryFs({
    '.codex/config.toml': CONFIG_FIXTURE,
    '.codex/auth.json': AUTH_FIXTURE,
    [MODELS_PATH]: MODELS_FIXTURE,
    ...files,
  })
}

/** 在 fixture 顶层键后注入 model_catalog_json（TOML 顶层键须位于表之前） */
function configWithCatalogKey(path: string): string {
  return CONFIG_FIXTURE.replace(
    'model_provider = "openai"',
    `model_provider = "openai"\nmodel_catalog_json = "${path}"`
  )
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

  it('读取当前模型与供应商（展示名优先取块内 name）', async () => {
    const target = createCodexTarget(seededFs())
    expect(await target.detect()).toEqual({
      tool: 'codex',
      status: 'installed',
      activeModel: 'gpt-5.2-codex',
      activeProviderName: 'OpenAI',
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
    expect(readProviders(fs)[INJECTED]?.name).toBe(preset.providerName)
    expect(readProviders(fs)[INJECTED]?.base_url).toBe('https://relay.example.com/v1')
    expect(readProviders(fs)[INJECTED]?.wire_api).toBe('responses')
    expect(readProviders(fs)[INJECTED]?.experimental_bearer_token).toBe('sk-test-key')
    expect(readProviders(fs).openai).toEqual({ name: 'OpenAI', wire_api: 'responses' })
    expect(readProviders(fs).deepseek).toEqual({
      name: 'deepseek',
      base_url: 'https://api.deepseek.com/',
      wire_api: 'responses',
      experimental_bearer_token: 'sk-ds-real-token',
    })
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
})

describe('CodexConfigTarget · rollback', () => {
  it('rollback：恢复两个文件与模型目录的最近备份', async () => {
    const fs = seededFs()
    const target = createCodexTarget(fs)
    await target.apply(
      makePreset({ tool: 'codex', modelMetadata: { context_window: 128000 } })
    )

    expect(await target.rollback()).toBe(true)
    expect(fs.files().get('.codex/config.toml')).toBe(CONFIG_FIXTURE)
    expect(fs.files().get('.codex/auth.json')).toBe(AUTH_FIXTURE)
    expect(fs.files().get(MODELS_PATH)).toBe(MODELS_FIXTURE)
  })
})

describe('CodexConfigTarget · 模型目录（models.json）', () => {
  it('预设携带元数据 → 目录重写为仅当前条目并指向托管路径', async () => {
    const fs = seededFs()
    const target = createCodexTarget(fs)
    const preset = makePreset({
      tool: 'codex',
      baseUrl: 'https://relay.example.com/v1',
      modelMetadata: { context_window: 128000 },
    })

    await target.apply(preset)

    expect(readToml(fs).model_catalog_json).toBe(MANAGED_CATALOG)
    const catalog: unknown = JSON.parse(fs.files().get(MODELS_PATH) ?? '{}')
    expect(findCatalogEntry(catalog, 'glm-4.6')).toEqual({
      slug: 'glm-4.6',
      context_window: 128000,
      display_name: 'glm-4.6',
    })
    expect(findCatalogEntry(catalog, 'deepseek-v4-flash')).toBeNull()
    expect(await target.verify(preset)).toBe(true)
  })

  it('无元数据但目录已有该模型条目 → 目录与既有键保持现状', async () => {
    const customKey = 'C:/custom/catalog.json'
    const fs = seededFs({ '.codex/config.toml': configWithCatalogKey(customKey) })
    const target = createCodexTarget(fs)
    const preset = makePreset({ tool: 'codex', baseUrl: 'https://relay.example.com/v1' })

    await target.apply(preset)

    expect(readToml(fs).model_catalog_json).toBe(customKey)
    expect(fs.files().get(MODELS_PATH)).toBe(MODELS_FIXTURE)
    expect(await target.verify(preset)).toBe(true)
  })

  it('无元数据且目录无条目 → 移除指向键回落内置目录', async () => {
    const fs = seededFs({ '.codex/config.toml': configWithCatalogKey('C:/custom/catalog.json') })
    const target = createCodexTarget(fs)
    const preset = makePreset({
      tool: 'codex',
      baseUrl: 'https://relay.example.com/v1',
      model: 'brand-new-model',
    })

    await target.apply(preset)

    expect(readToml(fs).model_catalog_json).toBeUndefined()
    expect(fs.files().get(MODELS_PATH)).toBe(MODELS_FIXTURE)
    expect(await target.verify(preset)).toBe(true)
  })
})

describe('CodexConfigTarget · 整份文件元数据（同族模型）', () => {
  it('整份文件元数据 → 同族条目全部写入目录', async () => {
    const fs = seededFs()
    const target = createCodexTarget(fs)
    const preset = makePreset({
      tool: 'codex',
      baseUrl: 'https://relay.example.com/v1',
      modelMetadata: {
        models: [
          { slug: 'glm-4.6', context_window: 128000 },
          { slug: 'glm-5-turbo', context_window: 100000, display_name: 'GLM-5-Turbo' },
        ],
      },
    })

    await target.apply(preset)

    const catalog: unknown = JSON.parse(fs.files().get(MODELS_PATH) ?? '{}')
    expect(findCatalogEntry(catalog, 'glm-4.6')).toEqual({
      slug: 'glm-4.6',
      context_window: 128000,
      display_name: 'glm-4.6',
    })
    expect(findCatalogEntry(catalog, 'glm-5-turbo')).toEqual({
      slug: 'glm-5-turbo',
      context_window: 100000,
      display_name: 'GLM-5-Turbo',
    })
    expect(findCatalogEntry(catalog, 'deepseek-v4-flash')).toBeNull()
    expect(await target.verify(preset)).toBe(true)
  })
})
