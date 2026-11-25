import { describe, expect, it } from 'vitest'

import type { Preset } from '@/domain/entities/preset'
import { AppError } from '@/domain/errors'
import {
  catalogHasEntry,
  codexCatalogAbsolutePath,
  findCatalogEntry,
  planCodexCatalog,
  replaceModelCatalog,
  withCatalogKey,
  withSingleEntry,
} from '@/domain/rules/codex-catalog'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import { makePreset } from '../../helpers/make-preset'

const CATALOG = {
  models: [
    { slug: 'deepseek-v4-flash', context_window: 1048576 },
    { slug: 'glm-4.6', context_window: 200000 },
  ],
}

const ABS_PATH = 'C:/Users/tester/.codex/models.json'

describe('codexCatalogAbsolutePath', () => {
  it('正斜杠 HOME 直接拼接；反斜杠 HOME 统一转正斜杠', () => {
    expect(codexCatalogAbsolutePath('C:/Users/jakej')).toBe('C:/Users/jakej/.codex/models.json')
    expect(codexCatalogAbsolutePath('C:\\Users\\jakej')).toBe('C:/Users/jakej/.codex/models.json')
  })
})

describe('catalogHasEntry / findCatalogEntry', () => {
  it('按 slug 查找；非目录结构返回未命中', () => {
    expect(catalogHasEntry(CATALOG, 'glm-4.6')).toBe(true)
    expect(findCatalogEntry(CATALOG, 'glm-4.6')).toEqual({
      slug: 'glm-4.6',
      context_window: 200000,
    })
    expect(catalogHasEntry(CATALOG, 'gpt-5.5')).toBe(false)
    expect(findCatalogEntry(null, 'glm-4.6')).toBeNull()
    expect(findCatalogEntry({ models: 'x' }, 'glm-4.6')).toBeNull()
  })
})

describe('replaceModelCatalog', () => {
  it('目录重写为仅当前预设条目（根字段保留），其他供应商条目移出选单', () => {
    const preset = makePreset({ tool: 'codex', modelMetadata: { context_window: 128000 } })
    const replaced = replaceModelCatalog({ ...CATALOG, version: 1 }, preset)

    expect(replaced.version).toBe(1)
    expect(replaced.models).toEqual([
      { slug: 'glm-4.6', context_window: 128000, display_name: 'glm-4.6' },
    ])
  })

  it('slug 与预设模型不一致时报错（条目永远不会生效）', () => {
    const preset = makePreset({
      tool: 'codex',
      modelMetadata: { slug: 'other-model', context_window: 1 },
    })
    expect(() => replaceModelCatalog(CATALOG, preset)).toThrow(AppError)
  })

  it('非对象基线按空目录处理；元数据非对象报错', () => {
    const preset = makePreset({ tool: 'codex', modelMetadata: { context_window: 1 } })
    expect(replaceModelCatalog(null, preset).models).toEqual([
      { slug: 'glm-4.6', context_window: 1, display_name: 'glm-4.6' },
    ])
    const bad = makePreset({
      tool: 'codex',
      modelMetadata: 'nope' as unknown as Preset['modelMetadata'],
    })
    expect(() => replaceModelCatalog(CATALOG, bad)).toThrow(AppError)
  })
})

describe('replaceModelCatalog · 整份文件粘贴', () => {
  const FILE = {
    models: [
      { slug: 'glm-5-turbo', context_window: 100000, display_name: 'GLM-5-Turbo' },
      { slug: 'glm-4.6', context_window: 200000 },
    ],
  }

  it('同族条目全部保留进选单；当前模型条目归一化，姊妹条目仅补 display_name', () => {
    const preset = makePreset({ tool: 'codex', modelMetadata: FILE })
    const replaced = replaceModelCatalog(CATALOG, preset)
    expect(replaced.models).toEqual([
      { slug: 'glm-5-turbo', context_window: 100000, display_name: 'GLM-5-Turbo' },
      { slug: 'glm-4.6', context_window: 200000, display_name: 'glm-4.6' },
    ])
  })

  it('文件中无与模型名匹配的条目 → 报错；单条缺失 display_name 以模型名补齐', () => {
    const noMatch = makePreset({
      tool: 'codex',
      modelMetadata: { models: [{ slug: 'other-model' }] },
    })
    expect(() => replaceModelCatalog(CATALOG, noMatch)).toThrow(AppError)
    const bare = makePreset({ tool: 'codex', modelMetadata: { context_window: 5 } })
    expect(replaceModelCatalog(null, bare).models).toEqual([
      { slug: 'glm-4.6', context_window: 5, display_name: 'glm-4.6' },
    ])
  })
})

describe('withSingleEntry', () => {
  it('目录重写为一条可被 Codex 解析的最小条目，根字段保留', () => {
    const entry = withSingleEntry({ ...CATALOG, version: 1 }, 'deepseek-v4.1-flash')
    expect(entry.version).toBe(1)
    expect(entry.models).toHaveLength(1)
    const model = entry.models[0]
    expect(model).toMatchObject({
      slug: 'deepseek-v4.1-flash',
      display_name: 'deepseek-v4.1-flash',
      visibility: 'list',
      supported_in_api: true,
      shell_type: 'shell_command',
      truncation_policy: { mode: 'tokens', limit: 10000 },
    })
    expect(model).toHaveProperty('base_instructions')
    expect(model).toHaveProperty('supported_reasoning_levels')
    expect(model).toHaveProperty('experimental_supported_tools')
  })

  it('非目录基线按空目录处理', () => {
    expect(withSingleEntry(null, 'm').models).toHaveLength(1)
  })
})

describe('planCodexCatalog · 元数据与内置目录', () => {
  it('预设携带元数据 → 重写为仅当前条目并指向托管目录', () => {
    const preset = makePreset({ tool: 'codex', modelMetadata: { context_window: 1 } })
    const plan = planCodexCatalog({ catalog: CATALOG, preset, absCatalogPath: ABS_PATH })
    expect(plan.keyAction).toEqual({ type: 'point', path: ABS_PATH })
    expect(plan.modelsFile?.models).toEqual([
      { slug: 'glm-4.6', context_window: 1, display_name: 'glm-4.6' },
    ])
  })

  it('内置目录已认识该模型 → 移除托管指向，回落内置元数据', () => {
    const preset = makePreset({ tool: 'codex', model: 'gpt-5.5' })
    const plan = planCodexCatalog({
      catalog: CATALOG,
      preset,
      absCatalogPath: ABS_PATH,
      builtinCatalog: { models: [{ slug: 'gpt-5.5' }] },
    })
    expect(plan).toEqual({ modelsFile: null, keyAction: { type: 'remove' } })
  })

  it('内置目录已认识但用户自维护指针 → 保持指针不动', () => {
    const preset = makePreset({ tool: 'codex', model: 'gpt-5.5' })
    const plan = planCodexCatalog({
      catalog: CATALOG,
      preset,
      absCatalogPath: ABS_PATH,
      builtinCatalog: { models: [{ slug: 'gpt-5.5' }] },
      currentPointer: 'C:/custom/catalog.json',
    })
    expect(plan.keyAction).toEqual({ type: 'keep' })
  })
})

describe('planCodexCatalog · 托管目录与兜底', () => {
  it('托管目录已有条目 → 重新指向托管目录（补回被移除的键）', () => {
    const preset = makePreset({ tool: 'codex', model: 'glm-4.6' })
    expect(planCodexCatalog({ catalog: CATALOG, preset, absCatalogPath: ABS_PATH })).toEqual({
      modelsFile: null,
      keyAction: { type: 'point', path: ABS_PATH },
    })
  })

  it('托管目录已有条目但指针是用户自维护路径 → 不动', () => {
    const preset = makePreset({ tool: 'codex', model: 'glm-4.6' })
    const plan = planCodexCatalog({
      catalog: CATALOG,
      preset,
      absCatalogPath: ABS_PATH,
      currentPointer: 'C:/custom/catalog.json',
    })
    expect(plan.keyAction).toEqual({ type: 'keep' })
  })

  it('目录无条目且非内置模型 → 生成最小条目并指向托管目录', () => {
    const preset = makePreset({ tool: 'codex', model: 'deepseek-v4.1-flash' })
    const plan = planCodexCatalog({ catalog: CATALOG, preset, absCatalogPath: ABS_PATH })
    expect(plan.keyAction).toEqual({ type: 'point', path: ABS_PATH })
    expect(plan.modelsFile?.models).toEqual([
      expect.objectContaining({ slug: 'deepseek-v4.1-flash', display_name: 'deepseek-v4.1-flash' }),
    ])
  })
})

describe('withCatalogKey', () => {
  const CONFIG: CodexConfig = { model: 'm', model_catalog_json: 'C:/old/catalog.json' }

  it('point 覆盖键值；remove 删除键；keep 原样保留（含既有值）', () => {
    expect(withCatalogKey(CONFIG, { type: 'point', path: ABS_PATH }).model_catalog_json).toBe(
      ABS_PATH
    )
    expect(withCatalogKey(CONFIG, { type: 'remove' }).model_catalog_json).toBeUndefined()
    expect(withCatalogKey(CONFIG, { type: 'keep' })).toBe(CONFIG)
  })
})
