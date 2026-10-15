import { z } from 'zod'

/** 目标工具枚举：新增工具时在此扩展（PRD §5.2） */
export const targetToolSchema = z.enum(['claude-code', 'codex'])

/**
 * 认证方式（PRD §5.14）：
 * api-key = 由 AISwitch 写入供应商密钥；subscription = 使用 CLI 自带的官方订阅登录态，
 * AISwitch 不写入任何密钥、不写 Base URL，鉴权完全交给 CLI 的 OAuth 凭据。
 */
export const authModeSchema = z.enum(['api-key', 'subscription'])

/** 预设 Schema：字段与校验规则与 docs/PRD.md §5.2 一一对应 */
export const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  tool: targetToolSchema,
  providerName: z.string().min(1).max(50),
  /** 缺省 api-key：历史预设库（无该字段）解析后一律按密钥模式处理 */
  authMode: authModeSchema.default('api-key'),
  /** 留空 = 官方 API */
  baseUrl: z.url().optional(),
  /** 供应商 API Key；本地模型（Ollama / LM Studio 等）可留空 */
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1).max(100),
  /** 仅 claude-code 使用 */
  smallFastModel: z.string().min(1).max(100).optional(),
  /** 仅 codex 使用：models.json 目录条目（opaque 透传，结构与 Codex 版本耦合，不做字段校验） */
  modelMetadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

/** 预设库文件 ~/.aiswitch/presets.json 的结构 */
export const presetCollectionSchema = z.object({
  version: z.literal(1),
  presets: z.array(presetSchema),
})

/**
 * 创建/更新预设时的用户输入（id 与时间戳由服务层生成）。
 * authMode 在此为必填：存储层对历史数据有默认值，但新写入必须显式声明认证方式。
 */
export const presetInputSchema = presetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({ authMode: authModeSchema })
