import type { Preset } from '@/domain/entities/preset'
import { isActivePreset } from '@/domain/rules/active-preset'
import { useToolStatus } from './use-tool-status'

/** 预设是否为该工具当前生效的配置（探测状态复用 TanStack Query 缓存，切换后自动失效刷新） */
export function useIsPresetActive(preset: Preset): boolean {
  const { data: statuses } = useToolStatus()
  const status = (statuses ?? []).find((item) => item.tool === preset.tool)
  return isActivePreset(preset, status)
}
