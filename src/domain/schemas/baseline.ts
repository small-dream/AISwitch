import { z } from 'zod'

/**
 * 安装前基线（首次快照）清单结构。
 * 「安装前」定义为：本应用第一次写入该工具配置之前（惰性捕获，PRD US-一键还原）。
 * 基线独立于 backups 目录，不受滚动清理影响，是「一键还原」的锚点。
 */

/** 单个受管文件的基线状态 */
export const baselineEntrySchema = z.object({
  /** captured = 已保存安装前内容副本；absent = 安装前不存在；degraded = 原始内容只可能在备份链里 */
  status: z.enum(['captured', 'absent', 'degraded']),
  /** 捕获时间（ISO 字符串） */
  capturedAt: z.string(),
  /**
   * 应用是否真的写过该文件（成功 apply / clearManaged 后置位）。
   * 仅 `absent` 需要它：只有应用写过，还原才允许删除；用户或 CLI 后来自己创建的
   * 文件（如 `codex login` 写入的 auth.json）即便安装前不存在也必须保留。
   * 旧清单没有该字段 = 未证实，一律按「不能删」处理。
   */
  written: z.boolean().optional(),
})

export type BaselineEntry = z.infer<typeof baselineEntrySchema>

/** 单个工具的基线状态：files 键为相对 HOME 的正斜杠路径 */
export const baselineToolStateSchema = z.object({
  /** 工具配置目录是否先于本应用存在（false 时还原后允许在目录为空的情况下删除目录） */
  dirExisted: z.boolean(),
  files: z.record(z.string(), baselineEntrySchema),
})

export type BaselineToolState = z.infer<typeof baselineToolStateSchema>

export const baselineManifestSchema = z.object({
  version: z.literal(1),
  // partialRecord：工具按需捕获，未捕获的工具不出现在 manifest 中
  tools: z.partialRecord(z.enum(['claude-code', 'codex']), baselineToolStateSchema),
})

export type BaselineManifest = z.infer<typeof baselineManifestSchema>

/** 空 manifest（无任何工具捕获过） */
export const EMPTY_BASELINE_MANIFEST: BaselineManifest = { version: 1, tools: {} }
