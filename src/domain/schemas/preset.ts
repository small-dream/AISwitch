import { z } from 'zod'

/** 目标工具枚举：新增工具时在此扩展（PRD §5.2） */
export const targetToolSchema = z.enum(['claude-code', 'codex'])

/** 预设 Schema：字段与校验规则与 docs/PRD.md §5.2 一一对应 */
export const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  tool: targetToolSchema,
  providerName: z.string().min(1).max(50),
  /** 留空 = 官方 API */
  baseUrl: z.url().optional(),
  apiKey: z.string().min(1),
  model: z.string().min(1).max(100),
  /** 仅 claude-code 使用 */
  smallFastModel: z.string().min(1).max(100).optional(),
  /** 仅 codex 使用：models.json 目录条目（opaque 透传，结构与 Codex 版本耦合，不做字段校验） */
  modelMetadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

/** 预设库文件 ~/.jakeaitools/presets.json 的结构 */
export const presetCollectionSchema = z.object({
  version: z.literal(1),
  presets: z.array(presetSchema),
})

/** 创建/更新预设时的用户输入（id 与时间戳由服务层生成） */
export const presetInputSchema = presetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
