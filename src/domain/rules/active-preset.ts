import type { Preset, ToolStatus } from '@/domain/entities/preset'

/**
 * 判断预设是否为工具当前生效的配置（供列表高亮「当前」项）：
 * 1) 模型名精确匹配；
 * 2) 供应商维度——只看探测出的 `activeProviderUrl`（自定义供应商才有值），
 *    不能看展示名：Codex 非注入 provider 块的展示名是块内 `name`（如 "DeepSeek"），
 *    按「是否以 http 开头」判断会把它当成官方，导致真正的预设反而不高亮。
 */
export function isActivePreset(preset: Preset, status: ToolStatus | undefined): boolean {
  if (!status?.activeModel || status.status !== 'installed') {
    return false
  }
  if (preset.model !== status.activeModel) {
    return false
  }
  return preset.baseUrl ? status.activeProviderUrl === preset.baseUrl : !status.activeProviderUrl
}
