import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { Preset } from '@/domain/entities/preset'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import { isRecord } from '@/utils/guards'

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
  | { type: 'point'; path: string }
  | { type: 'remove' }
  | { type: 'keep' }

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
export function findCatalogEntry(
  catalog: unknown,
  slug: string
): Record<string, unknown> | null {
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

/** 补齐 Codex 反序列化必填的 slug 与 display_name（缺失将导致整个目录加载失败） */
function normalizeEntry(
  entry: Record<string, unknown>,
  model: string
): Record<string, unknown> {
  if (typeof entry.slug === 'string' && entry.slug !== model) {
    throw new AppError('E_VALIDATION_FAILED', '元数据条目 slug 与预设模型不一致', {
      slug: entry.slug,
      model,
    })
  }
  const displayName =
    typeof entry.display_name === 'string' && entry.display_name ? entry.display_name : model
  return { ...entry, slug: model, display_name: displayName }
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
    throw new AppError('E_VALIDATION_FAILED', '模型元数据是整份目录文件，但其中没有与模型名匹配的条目', {
      model: preset.model,
    })
  }
  return records.map((entry) => (entry === matched ? normalizeEntry(entry, preset.model) : withDisplayName(entry)))
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

/**
 * 切换时的目录决策（纯函数）：
 * 1. 预设携带元数据 → 目录重写为该预设的条目集并指向它（选单只含当前供应商的模型）；
 * 2. 无元数据但目录已有该模型条目 → 全部保持现状（用户/厂商自维护场景）；
 * 3. 无元数据且目录无条目 → 移除指向键，回落内置目录（官方模型恢复元数据）。
 */
export function planCodexCatalog(
  catalog: unknown,
  preset: Preset,
  absCatalogPath: string
): CodexCatalogPlan {
  if (preset.modelMetadata) {
    return {
      modelsFile: replaceModelCatalog(catalog, preset),
      keyAction: { type: 'point', path: absCatalogPath },
    }
  }
  if (catalogHasEntry(catalog, preset.model)) {
    return { modelsFile: null, keyAction: { type: 'keep' } }
  }
  return { modelsFile: null, keyAction: { type: 'remove' } }
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
