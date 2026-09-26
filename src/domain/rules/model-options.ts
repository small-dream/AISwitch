import { PROVIDER_TEMPLATES } from '@/constants/provider-templates'
import type { TargetTool } from '@/domain/entities/preset'

/** 归一化 Base URL：忽略大小写、结尾斜杠与 CLI 自行追加的 /v1 */
function normalizeBaseUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '').replace(/\/v1$/, '').toLowerCase()
}

/**
 * 模板推荐模型（离线候选）：按 Base URL 反查同一供应商在该工具下的模板变体，
 * 因此编辑既有预设时无需记住当初选了哪个模板。自定义地址匹配不到则返回空数组。
 *
 * 注意这只是一份「人工挑选的推荐子集」，不是供应商目录全集——UI 必须如实标注来源，
 * 否则用户会以为下拉里的几条就是全部可用模型。
 */
export function templateModelOptions(
  tool: TargetTool,
  baseUrl: string | undefined
): readonly string[] {
  const target = normalizeBaseUrl(baseUrl)
  if (!target) {
    return []
  }
  for (const template of PROVIDER_TEMPLATES) {
    const variant = template.variants[tool]
    if (variant && normalizeBaseUrl(variant.baseUrl) === target) {
      return variant.suggestModels
    }
  }
  return []
}

/** 下拉候选分组：`label` 由 UI 本地化后填入，`options` 为该来源的模型名 */
export interface ModelOptionGroup {
  label: string
  options: readonly string[]
}

/** 去空白 + 按原顺序去重 */
function uniqueModels(models: readonly string[]): string[] {
  const names: string[] = []
  for (const model of models) {
    const name = model.trim()
    if (name && !names.includes(name)) {
      names.push(name)
    }
  }
  return names
}

/**
 * 按来源拆分候选：模板推荐在前，供应商目录去掉与推荐重复的条目。
 * 刻意不合并成一个列表——分开才能在界面上标明「哪条是模板推荐的、哪条来自供应商真实目录」。
 */
export function groupModelOptions(
  recommended: readonly string[],
  catalog: readonly string[]
): { recommended: string[]; catalog: string[] } {
  const first = uniqueModels(recommended)
  return { recommended: first, catalog: uniqueModels([...first, ...catalog]).slice(first.length) }
}
