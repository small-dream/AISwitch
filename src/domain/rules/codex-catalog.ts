import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { Preset } from '@/domain/entities/preset'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import { isRecord } from '@/utils/guards'
import { buildCatalogEntry } from './codex-catalog-entry'

/** ~/.codex/models.json 根结构：{ models: [条目...] }，其余根字段原样保留 */
export interface CodexModelCatalogFile {
  models: unknown[]
  [key: string]: unknown
}

/**
 * config.toml 顶层 model_catalog_json 键的动作：
 * point = 指向托管目录；remove = 移除该键（回落内置目录）；keep = 不动现有键。
 * 依据实测：model_catalog_json 是整体替换内置目录而非叠加——
 * 目录里没有当前模型时必须移除该键，否则官方模型元数据被遮蔽。
 */
export type CatalogKeyAction =
  { type: 'point'; path: string } | { type: 'remove' } | { type: 'keep' }

export interface CodexCatalogPlan {
  /** 需写回的 models.json 全量内容；null = 不修改文件 */
  modelsFile: CodexModelCatalogFile | null
  keyAction: CatalogKeyAction
}

/** HOME 绝对路径 → models.json 的 config.toml 取值（统一正斜杠，与 Codex 用法一致） */
export function codexCatalogAbsolutePath(home: string): string {
  return `${home.replace(/\\/g, '/')}/${PATHS.codexModels}`
}

function isCatalogFile(value: unknown): value is CodexModelCatalogFile {
  return isRecord(value) && Array.isArray(value.models)
}

/** 目录中是否存在指定 slug 的条目 */
export function catalogHasEntry(catalog: unknown, slug: string): boolean {
  return findCatalogEntry(catalog, slug) !== null
}

/** 查找指定 slug 的条目（导入捕获用）；无目录或无条目返回 null */
export function findCatalogEntry(catalog: unknown, slug: string): Record<string, unknown> | null {
  if (!isCatalogFile(catalog)) {
    return null
  }
  for (const entry of catalog.models) {
    if (isRecord(entry) && entry.slug === slug) {
      return entry
    }
  }
  return null
}

/**
 * 归一化用户输入的目录条目：粘贴「整个 models.json 文件」（{ models: [...] }）时
 * 要求其中含与模型名匹配的条目（文件可通过校验）；单条形态原样通过。
 */
export function resolveCatalogEntry(
  input: Record<string, unknown>,
  model: string
): Record<string, unknown> | null {
  if (!Array.isArray(input.models)) {
    return input
  }
  for (const candidate of input.models) {
    if (isRecord(candidate) && candidate.slug === model) {
      return input
    }
  }
  return null
}

/**
 * 用户可只覆盖关心的字段（如 supported_reasoning_levels），其余由兜底条目补齐：
 * Codex 缺任一必需字段都会让整份目录加载失败，部分条目不能原样落盘。
 * 若用户给了档位但没给默认值（或默认值不在档位里），默认到 medium / 第一档。
 */
function normalizeEntry(entry: Record<string, unknown>, model: string): Record<string, unknown> {
  if (typeof entry.slug === 'string' && entry.slug !== model) {
    throw new AppError('E_VALIDATION_FAILED', '元数据条目 slug 与预设模型不一致', {
      slug: entry.slug,
      model,
    })
  }
  const displayName =
    typeof entry.display_name === 'string' && entry.display_name ? entry.display_name : model
  return withReasoningDefaults({
    ...buildCatalogEntry(model),
    ...entry,
    slug: model,
    display_name: displayName,
  })
}

/** 默认推理档位必须落在 supported_reasoning_levels 内，否则 Codex 选择器会指向不存在的档位 */
function withReasoningDefaults(entry: Record<string, unknown>): Record<string, unknown> {
  const levels = entry.supported_reasoning_levels
  if (!Array.isArray(levels) || levels.length === 0) {
    return entry
  }
  const efforts = levels
    .map((level) => (isRecord(level) && typeof level.effort === 'string' ? level.effort : null))
    .filter((effort): effort is string => effort !== null)
  if (efforts.length === 0) {
    return entry
  }
  const current = entry.default_reasoning_level
  if (typeof current === 'string' && efforts.includes(current)) {
    return entry
  }
  return { ...entry, default_reasoning_level: efforts.includes('medium') ? 'medium' : efforts[0] }
}

/** 姊妹条目（同文件其他模型）原样保留，仅缺失必填 display_name 时以 slug 补齐 */
function withDisplayName(entry: Record<string, unknown>): Record<string, unknown> {
  if (typeof entry.display_name === 'string' && entry.display_name) {
    return entry
  }
  return { ...entry, display_name: typeof entry.slug === 'string' ? entry.slug : '' }
}

/**
 * 预设元数据 → 目录条目集：
 * 整份厂商文件 → 保留全部条目（同族模型都进选单，当前模型条目做归一化校验）；
 * 单条条目 → 仅该条。文件中无与模型名匹配的条目时报错。
 */
function resolveCatalogEntries(preset: Preset): Record<string, unknown>[] {
  const raw = preset.modelMetadata
  if (!isRecord(raw)) {
    throw new AppError('E_VALIDATION_FAILED', '模型元数据必须是 JSON 对象', { preset: preset.id })
  }
  if (!Array.isArray(raw.models)) {
    return [normalizeEntry(raw, preset.model)]
  }
  const records = raw.models.filter(isRecord)
  const matched = records.find((entry) => entry.slug === preset.model)
  if (!matched) {
    throw new AppError(
      'E_VALIDATION_FAILED',
      '模型元数据是整份目录文件，但其中没有与模型名匹配的条目',
      {
        model: preset.model,
      }
    )
  }
  return records.map((entry) =>
    entry === matched ? normalizeEntry(entry, preset.model) : withDisplayName(entry)
  )
}

/**
 * 目录内容反映当前预设：models 重写为该预设的条目集（根字段保留）。
 * Codex 的模型选单会列出目录中的全部 visibility=list 条目且无供应商归属概念，
 * 保留其他供应商的条目会导致选单混入无关模型；切回其他预设时由其自带元数据重建条目。
 */
export function replaceModelCatalog(catalog: unknown, preset: Preset): CodexModelCatalogFile {
  const base = isCatalogFile(catalog) ? catalog : {}
  return { ...base, models: resolveCatalogEntries(preset) }
}

/** 目录重写为仅含一条兜底条目（无元数据的自定义模型，保证桌面端能显示/选择它） */
export function withSingleEntry(catalog: unknown, model: string): CodexModelCatalogFile {
  const base = isCatalogFile(catalog) ? catalog : {}
  return { ...base, models: [buildCatalogEntry(model)] }
}

export interface CodexCatalogPlanInput {
  /** 托管目录 ~/.codex/models.json 的当前内容 */
  catalog: unknown
  preset: Preset
  /** 托管目录的绝对路径（写入 config.toml 的值） */
  absCatalogPath: string
  /** Codex 内置目录缓存（~/.codex/models_cache.json），用于判断模型是否已内置 */
  builtinCatalog?: unknown
  /** config.toml 里现有的 model_catalog_json；非托管路径视为用户自维护指针 */
  currentPointer?: string
}

/** 用户自己指向的目录文件（不是托管 models.json）不能被静默改写 */
function isUserPointer(pointer: string | undefined, managedPath: string): boolean {
  return pointer !== undefined && pointer !== managedPath
}

/**
 * 切换时的目录决策（纯函数）：
 * 1. 预设携带元数据 → 目录重写为该预设的条目集并指向它（选单只含当前供应商的模型）；
 * 2. 内置目录已认识该模型 → 移除托管指向（回落内置元数据）；用户自维护指针不动；
 * 3. 托管目录已有该模型条目 → 确保指向托管目录（补回曾被移除的键）；
 * 4. 其余 → 生成一条最小可用条目并指向托管目录，避免桌面端把它当未知模型回退。
 */
export function planCodexCatalog(input: CodexCatalogPlanInput): CodexCatalogPlan {
  const { catalog, preset, absCatalogPath, builtinCatalog, currentPointer } = input
  if (preset.modelMetadata) {
    return {
      modelsFile: replaceModelCatalog(catalog, preset),
      keyAction: { type: 'point', path: absCatalogPath },
    }
  }
  const userPointer = isUserPointer(currentPointer, absCatalogPath)
  if (catalogHasEntry(builtinCatalog, preset.model)) {
    return {
      modelsFile: null,
      keyAction: userPointer ? { type: 'keep' } : { type: 'remove' },
    }
  }
  if (catalogHasEntry(catalog, preset.model)) {
    return {
      modelsFile: null,
      keyAction: userPointer ? { type: 'keep' } : { type: 'point', path: absCatalogPath },
    }
  }
  return {
    modelsFile: withSingleEntry(catalog, preset.model),
    keyAction: { type: 'point', path: absCatalogPath },
  }
}

/** 将目录键动作应用到合并后的 config.toml 结构 */
export function withCatalogKey(config: CodexConfig, action: CatalogKeyAction): CodexConfig {
  if (action.type === 'keep') {
    return config
  }
  const next = { ...config }
  if (action.type === 'remove') {
    Reflect.deleteProperty(next, 'model_catalog_json')
    return next
  }
  return { ...next, model_catalog_json: action.path }
}
