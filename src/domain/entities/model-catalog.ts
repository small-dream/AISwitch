import type { TargetTool } from '@/domain/entities/preset'

/**
 * 拉取供应商模型目录所需的最小输入：预设表单只持有表单字段，
 * 无需构造完整 Preset（PRD US-19 模型名下拉）。
 */
export interface ModelCatalogQuery {
  tool: TargetTool
  baseUrl: string | undefined
  apiKey: string | undefined
}

/** 模型目录拉取结果：最佳努力，失败只影响下拉候选，不阻断手填模型名 */
export type ModelCatalogResult =
  { status: 'ok'; models: readonly string[] } | { status: 'error'; message: string }
