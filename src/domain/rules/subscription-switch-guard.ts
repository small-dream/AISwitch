import type { TargetTool } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'

/** 官方订阅切换被拦截时的登录态：未登录 / 无法确认 */
export type SubscriptionSwitchBlockState = 'logged-out' | 'unknown'

/**
 * 官方订阅切换守卫（PRD §5.13）：Codex 的 API Key 与 ChatGPT tokens 共用 auth.json。
 * 未登录时切到官方订阅会删掉 API Key，又没有 tokens 可回落，Codex 桌面端随即无法加载账号。
 * Claude Code 的 OAuth 凭据独立于托管文件，且可能存放在系统钥匙串，探测存在假阴性，故不做硬拦截。
 */
export function subscriptionSwitchBlock(
  tool: TargetTool,
  status: SubscriptionAuthStatus
): SubscriptionSwitchBlockState | null {
  if (tool !== 'codex' || status.state === 'logged-in') {
    return null
  }
  // CLI 仍决定展示态；但只要 auth.json 还有 tokens，清掉 API Key 后账号仍可回落，
  // 不应因为当前是 API Key 登录而阻止用户切回订阅。
  if (status.hasSubscriptionCredentials) {
    return null
  }
  return status.state
}
