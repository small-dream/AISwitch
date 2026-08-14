import type { z } from 'zod'
import type {
  presetCollectionSchema,
  presetSchema,
  targetToolSchema,
} from '@/domain/schemas/preset'

export type TargetTool = z.infer<typeof targetToolSchema>
export type Preset = z.infer<typeof presetSchema>
export type PresetCollection = z.infer<typeof presetCollectionSchema>

export type ToolInstallStatus = 'not-installed' | 'installed' | 'unknown'

export interface ToolStatus {
  tool: TargetTool
  status: ToolInstallStatus
  activeModel?: string
  activeProviderName?: string
}
