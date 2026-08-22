import type { ProviderTemplate } from '@/constants/provider-templates'

/** 模板预填结果：仅覆盖供应商名 / Base URL / 模型名，Key 始终留空由用户填写 */
export interface TemplateFill {
  providerName: string
  baseUrl?: string
  model: string
}

/** 模板 → 预填字段：providerName 用品牌名，model 取第一个建议模型 */
export function applyProviderTemplate(template: ProviderTemplate): TemplateFill {
  return {
    providerName: template.label,
    baseUrl: template.baseUrl,
    model: template.suggestModels[0] ?? '',
  }
}
