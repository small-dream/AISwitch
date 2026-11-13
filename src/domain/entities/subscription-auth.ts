import type { TargetTool } from '@/domain/entities/preset'

/**
 * 官方订阅登录态（PRD §5.13）：
 * logged-in  已检测到 CLI 的 OAuth 登录，或 CLI 不可读但有 tokens 辅助证据；
 * logged-out CLI 明确报告未登录 / API Key 登录；
 * unknown    CLI 不可读或输出无法识别，且没有 tokens 辅助证据，交由用户自行确认。
 */
export type SubscriptionLoginState = 'logged-in' | 'logged-out' | 'unknown'

/** 登录态探测结果：只暴露展示所需的非敏感信息，绝不携带 token 内容 */
export interface SubscriptionAuthStatus {
  tool: TargetTool
  state: SubscriptionLoginState
  /** 是否存在可回落的订阅凭据（只暴露布尔值，绝不携带 token 内容） */
  hasSubscriptionCredentials?: boolean
  /** 订阅类型展示名（如 Claude Pro / ChatGPT Plus） */
  plan?: string
  /** 账号标识（Claude 走钥匙串，回落 ~/.claude.json 时的邮箱） */
  account?: string
  /** OAuth 凭据过期时间（ISO） */
  expiresAt?: string
  /** 探测时实际使用的 CLI 可执行文件路径（仅 Codex），用于生成不依赖 PATH 的登录命令 */
  cliExecutable?: string
}
