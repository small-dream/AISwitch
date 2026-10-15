import type { Preset, ToolStatus } from '@/domain/entities/preset'
import { isActivePreset } from '@/domain/rules/active-preset'

/**
 * 内建订阅条目是否生效（PRD §5.13）：工具已配置 + 不在自定义中转上 + 该工具没有任何预设生效。
 * 订阅态不写模型（也不写密钥/Base URL），因此不能像普通预设那样按模型名比对，只能按「无托管覆盖」判定。
 */
export function isSubscriptionActive(
  status: ToolStatus | undefined,
  toolPresets: readonly Preset[]
): boolean {
  if (status?.status !== 'installed') {
    return false
  }
  if (status.activeProviderName?.startsWith('http')) {
    return false
  }
  return !toolPresets.some((preset) => isActivePreset(preset, status))
}
