import { PROVIDER_TEMPLATES } from '@/constants/provider-templates'
import type { TargetTool } from '@/domain/entities/preset'

/** 归一化 Base URL：忽略大小写、结尾斜杠与 CLI 自行追加的 /v1 */
function normalizeBaseUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '').replace(/\/v1$/, '').toLowerCase()
}

/**
 * 模板推荐模型（离线候选）：按 Base URL 反查同一供应商在该工具下的模板变体，
 * 因此编辑既有预设时无需记住当初选了哪个模板。自定义地址匹配不到则返回空数组。
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

/** 合并多组候选模型：按传入顺序去重（模板推荐在前，实拉目录在后） */
export function mergeModelOptions(...groups: readonly (readonly string[])[]): string[] {
  const merged: string[] = []
  for (const group of groups) {
    for (const model of group) {
      const name = model.trim()
      if (name && !merged.includes(name)) {
        merged.push(name)
      }
    }
  }
  return merged
}
