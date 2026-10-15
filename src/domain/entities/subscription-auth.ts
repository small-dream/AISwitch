import type { TargetTool } from '@/domain/entities/preset'

/**
 * 官方订阅登录态（PRD §5.14）：
 * logged-in  已检测到 CLI 的 OAuth 凭据；
 * logged-out 未检测到凭据（macOS 凭据存于系统钥匙串时以 ~/.claude.json 账号信息兜底）；
 * unknown    配置文件存在但无法解析，交由用户自行在 CLI 内确认。
 */
export type SubscriptionLoginState = 'logged-in' | 'logged-out' | 'unknown'

/** 登录态探测结果：只暴露展示所需的非敏感信息，绝不携带 token 内容 */
export interface SubscriptionAuthStatus {
  tool: TargetTool
  state: SubscriptionLoginState
  /** 订阅类型展示名（如 Claude Pro / ChatGPT Plus） */
  plan?: string
  /** 账号标识（Claude 走钥匙串，回落 ~/.claude.json 时的邮箱） */
  account?: string
  /** OAuth 凭据过期时间（ISO） */
  expiresAt?: string
}
