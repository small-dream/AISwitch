import { PATHS } from '@/constants/paths'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { parseCodexSubscription } from '@/domain/rules/subscription-credentials'
import type { FileSystemPort } from '@/types/fs-port'

/**
 * Codex 订阅登录态：~/.codex/auth.json 带 tokens（ChatGPT 登录写入）即已订阅登录；
 * 仅 OPENAI_API_KEY 属于 API Key 登录，不算订阅（PRD §5.13）。
 */
export async function detectCodexAuth(fs: FileSystemPort): Promise<SubscriptionAuthStatus> {
  const base = { tool: 'codex' as const }
  try {
    if (!(await fs.exists(PATHS.codexAuth))) {
      return { ...base, state: 'logged-out' }
    }
    const info = parseCodexSubscription(await fs.readTextFile(PATHS.codexAuth))
    return info ? { ...base, state: 'logged-in', ...info } : { ...base, state: 'logged-out' }
  } catch {
    return { ...base, state: 'unknown' }
  }
}
