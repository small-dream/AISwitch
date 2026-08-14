import type { z } from 'zod'
import type {
  presetCollectionSchema,
  presetInputSchema,
  presetSchema,
  targetToolSchema,
} from '@/domain/schemas/preset'

export type TargetTool = z.infer<typeof targetToolSchema>
export type Preset = z.infer<typeof presetSchema>
export type PresetInput = z.infer<typeof presetInputSchema>
export type PresetCollection = z.infer<typeof presetCollectionSchema>

/**
 * 探测语义基于「全局配置」而非 CLI 是否安装：
 * VS Code 插件形态使用时终端可能无 CLI，但全局配置同样生效（PRD §5.5）。
 */
export type ToolInstallStatus = 'not-configured' | 'installed' | 'unknown'

export interface ToolStatus {
  tool: TargetTool
  status: ToolInstallStatus
  activeModel?: string
  activeProviderName?: string
}
