import { PATHS } from '@/constants/paths'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { resolveCodexLoginState } from '@/domain/rules/codex-login-status'
import { parseCodexSubscription } from '@/domain/rules/subscription-credentials'
import type { CodexCliPort } from '@/types/codex-cli-port'
import type { FileSystemPort } from '@/types/fs-port'
import { tauriCodexCli } from './cli-status'

/**
 * Codex 订阅登录态以 `codex login status` 为准；auth.json 的 tokens 只在 CLI
 * 不可读时作为已登录的辅助证据，绝不因缺少 tokens 推断未登录（PRD §5.13）。
 */
async function readSubscriptionInfo(fs: FileSystemPort) {
  try {
    if (!(await fs.exists(PATHS.codexAuth))) {
      return null
    }
    return parseCodexSubscription(await fs.readTextFile(PATHS.codexAuth))
  } catch {
    return null
  }
}

export async function detectCodexAuth(
  fs: FileSystemPort,
  cli: CodexCliPort = tauriCodexCli
): Promise<SubscriptionAuthStatus> {
  const base = { tool: 'codex' as const }
  const info = await readSubscriptionInfo(fs)
  const state = resolveCodexLoginState(await cli.loginStatus(), info !== null)
  return info ? { ...base, state, ...info, hasSubscriptionCredentials: true } : { ...base, state }
}
