import type { ProviderTemplate } from '@/constants/provider-templates'
import type { TargetTool } from '@/domain/entities/preset'

/** 模板预填结果：仅覆盖供应商名 / Base URL / 模型名 / 小模型，Key 始终留空由用户填写 */
export interface TemplateFill {
  providerName: string
  baseUrl?: string
  model: string
  smallFastModel?: string
}

/**
 * 模板 → 预填字段：按当前工具取对应变体，providerName 用品牌名，
 * model 取该工具的第一个建议模型（每个工具可用模型不同）。
 * 模板未声明该工具时返回 null（调用方只应展示适用模板）。
 */
export function applyProviderTemplate(
  template: ProviderTemplate,
  tool: TargetTool
): TemplateFill | null {
  const variant = template.variants[tool]
  if (!variant) {
    return null
  }
  return {
    providerName: template.label,
    baseUrl: variant.baseUrl,
    model: variant.suggestModels[0] ?? '',
    smallFastModel: variant.smallFastModel,
  }
}
