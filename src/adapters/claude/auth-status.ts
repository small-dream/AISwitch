import { PATHS } from '@/constants/paths'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import {
  parseClaudeCredentials,
  parseClaudeUserAccount,
} from '@/domain/rules/subscription-credentials'
import type { FileSystemPort } from '@/types/fs-port'

/**
 * Claude Code 订阅登录态：优先读 OAuth 凭据文件；macOS 凭据在系统钥匙串、
 * 文件不存在时回落到 ~/.claude.json 记录的账号信息（PRD §5.13）。
 * 解析失败归 unknown，宁可让用户在 CLI 内确认，也不误报「未登录」。
 */
export async function detectClaudeAuth(fs: FileSystemPort): Promise<SubscriptionAuthStatus> {
  const base = { tool: 'claude-code' as const }
  try {
    if (await fs.exists(PATHS.claudeCredentials)) {
      const info = parseClaudeCredentials(await fs.readTextFile(PATHS.claudeCredentials))
      if (info) {
        return { ...base, state: 'logged-in', ...info }
      }
    }
    if (await fs.exists(PATHS.claudeUserConfig)) {
      const info = parseClaudeUserAccount(await fs.readTextFile(PATHS.claudeUserConfig))
      if (info) {
        return { ...base, state: 'logged-in', ...info }
      }
    }
    return { ...base, state: 'logged-out' }
  } catch {
    return { ...base, state: 'unknown' }
  }
}
