import { z } from 'zod'

/**
 * Claude settings.json 宽松结构：仅声明关心的字段，
 * 其余字段原样保留（PRD §5.1：防抹掉用户其他配置）。
 * model 为 Claude Code 原生顶层模型字段（/model 写入），导入时作兜底。
 */
export const claudeSettingsSchema = z.looseObject({
  env: z.record(z.string(), z.string()).optional(),
  model: z.string().optional(),
})

export type ClaudeSettings = z.infer<typeof claudeSettingsSchema>
