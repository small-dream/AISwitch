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
    expect(findCatalogEntry(CATALOG, 'glm-4.6')).toEqual({ slug: 'glm-4.6', context_window: 200000 })
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
    const bad = makePreset({ tool: 'codex', modelMetadata: 'nope' as unknown as Preset['modelMetadata'] })
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

describe('planCodexCatalog', () => {
  it('预设携带元数据 → 重写为仅当前条目并指向托管目录', () => {
    const preset = makePreset({ tool: 'codex', modelMetadata: { context_window: 1 } })
    const plan = planCodexCatalog(CATALOG, preset, ABS_PATH)
    expect(plan.keyAction).toEqual({ type: 'point', path: ABS_PATH })
    expect(plan.modelsFile?.models).toEqual([
      { slug: 'glm-4.6', context_window: 1, display_name: 'glm-4.6' },
    ])
  })

  it('无元数据但目录已有条目 → 文件与键全部保持现状', () => {
    const preset = makePreset({ tool: 'codex', model: 'glm-4.6' })
    expect(planCodexCatalog(CATALOG, preset, ABS_PATH)).toEqual({
      modelsFile: null,
      keyAction: { type: 'keep' },
    })
  })

  it('无元数据且目录无条目 → 移除指向键回落内置目录', () => {
    const preset = makePreset({ tool: 'codex', model: 'gpt-5.5' })
    expect(planCodexCatalog(CATALOG, preset, ABS_PATH)).toEqual({
      modelsFile: null,
      keyAction: { type: 'remove' },
    })
    expect(planCodexCatalog(null, makePreset({ tool: 'codex' }), ABS_PATH).keyAction).toEqual({
      type: 'remove',
    })
  })
})

describe('withCatalogKey', () => {
  const CONFIG: CodexConfig = { model: 'm', model_catalog_json: 'C:/old/catalog.json' }

  it('point 覆盖键值；remove 删除键；keep 原样保留（含既有值）', () => {
    expect(withCatalogKey(CONFIG, { type: 'point', path: ABS_PATH }).model_catalog_json).toBe(ABS_PATH)
    expect(withCatalogKey(CONFIG, { type: 'remove' }).model_catalog_json).toBeUndefined()
    expect(withCatalogKey(CONFIG, { type: 'keep' })).toBe(CONFIG)
  })
})
