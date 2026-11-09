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
  /** 带给用户看的供应商展示名（如 `DeepSeek`、`官方 API`） */
  activeProviderName?: string
  /**
   * 当前生效供应商的 Base URL：仅「自定义供应商」有值，官方走 CLI 内置时为空。
   * 生效判定只看这个字段——展示名可能是任意文案（块内 name / provider id），
   * 拿它做 URL 判断会把用户自建 provider 块误判成官方。
   */
  activeProviderUrl?: string
}
