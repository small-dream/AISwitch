import type { SubscriptionLoginState } from '@/domain/entities/subscription-auth'
import type { CodexCliResult } from '@/types/codex-cli-port'

const LOGGED_IN = /logged in using chatgpt/i
const LOGGED_OUT = /not logged in|api key configured/i

/**
 * 解析 Codex CLI 登录态（PRD §5.13）：
 * - CLI 明确 ChatGPT 登录 → logged-in
 * - CLI 明确未登录 / API Key → logged-out
 * - CLI 不可用或输出无法识别 → 有 tokens 才作为辅助证据判已登录，否则 unknown
 * 绝不因「tokens 不存在」推断未登录。
 */
export function resolveCodexLoginState(
  cli: CodexCliResult,
  hasSubscriptionCredentials: boolean
): SubscriptionLoginState {
  const output = cli.status === 'ran' ? `${cli.stdout}\n${cli.stderr}` : ''
  if (LOGGED_IN.test(output)) {
    return 'logged-in'
  }
  if (LOGGED_OUT.test(output)) {
    return 'logged-out'
  }
  return hasSubscriptionCredentials ? 'logged-in' : 'unknown'
}
