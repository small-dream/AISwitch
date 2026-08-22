import type { Preset, TargetTool, ToolStatus } from '@/domain/entities/preset'
import { isActivePreset } from '@/domain/rules/active-preset'

/**
 * 循环选择当前工具的下一个预设（US-20）：
 * 空列表 / 仅一个预设时无「下一个」可切，返回 undefined；
 * 找到当前生效项时取其下一项（循环回绕），当前生效项不在列表（如刚导入未切换）时取第一项。
 */
export function nextPresetId(
  presets: readonly Preset[],
  tool: TargetTool,
  status: ToolStatus | undefined
): string | undefined {
  const list = presets.filter((preset) => preset.tool === tool)
  if (list.length < 2) {
    return undefined
  }
  const activeIndex = list.findIndex((preset) => isActivePreset(preset, status))
  const nextIndex = activeIndex >= 0 ? (activeIndex + 1) % list.length : 0
  return list[nextIndex]?.id
}
