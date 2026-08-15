import type { Preset, ToolStatus } from '@/domain/entities/preset'

/**
 * 判断预设是否为工具当前生效的配置（供列表高亮「当前」项）：
 * 1) 模型名精确匹配；
 * 2) 供应商维度——自定义供应商时探测值为其 base URL（claude / codex 语义一致，
 *    见 adapters 中 activeProviderName 的来源），官方 API 时探测值不是 URL；
 *    因此按预设是否携带 baseUrl 分别比对。
 */
export function isActivePreset(preset: Preset, status: ToolStatus | undefined): boolean {
  if (!status?.activeModel || status.status !== 'installed') {
    return false
  }
  if (preset.model !== status.activeModel) {
    return false
  }
  const provider = status.activeProviderName ?? ''
  const providerIsCustom = provider.startsWith('http')
  return preset.baseUrl ? provider === preset.baseUrl : !providerIsCustom
}
