import { isRecord } from '@/utils/guards'

/** 登录态判定的核心信息（不含 token 内容本身） */
export interface SubscriptionCredentialInfo {
  plan?: string
  account?: string
  expiresAt?: string
}

/** 订阅类型展示名：CLI 写入的原始值 → 展示名 */
const PLAN_LABELS: Record<string, string> = {
  pro: 'Pro',
  max: 'Max',
  team: 'Team',
  plus: 'Plus',
  business: 'Business',
  enterprise: 'Enterprise',
}

function planLabel(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw) {
    return undefined
  }
  return PLAN_LABELS[raw.toLowerCase()] ?? raw
}

function isoFrom(value: unknown): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }
  // CLI 侧可能写入秒级或毫秒级时间戳，统一归一到 ISO
  const millis = value < 1e12 ? value * 1000 : value
  return new Date(millis).toISOString()
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replaceAll('-', '+').replaceAll('_', '/')
  return atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
}

/** 从 JWT 载荷解出 Codex 的套餐类型（解析失败一律返回 undefined，不影响登录态判定） */
function codexPlanFromIdToken(idToken: unknown): string | undefined {
  if (typeof idToken !== 'string') {
    return undefined
  }
  const payload = idToken.split('.')[1]
  if (!payload) {
    return undefined
  }
  try {
    const claims: unknown = JSON.parse(base64UrlDecode(payload))
    if (!isRecord(claims)) {
      return undefined
    }
    const auth = claims['https://api.openai.com/auth']
    return isRecord(auth) ? planLabel(auth.chatgpt_plan_type) : undefined
  } catch {
    return undefined
  }
}

/**
 * ~/.claude/.credentials.json（Linux / Windows 的 OAuth 凭据文件）：
 * 存在 claudeAiOauth 且携带 access/refresh token 即视为已登录；否则返回 null。
 */
export function parseClaudeCredentials(raw: string): SubscriptionCredentialInfo | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value) || !isRecord(value.claudeAiOauth)) {
    return null
  }
  const oauth = value.claudeAiOauth
  if (typeof oauth.accessToken !== 'string' && typeof oauth.refreshToken !== 'string') {
    return null
  }
  return { plan: planLabel(oauth.subscriptionType), expiresAt: isoFrom(oauth.expiresAt) }
}

/** ~/.claude.json 的 oauthAccount：macOS 凭据在钥匙串时的登录态兜底信号 */
export function parseClaudeUserAccount(raw: string): SubscriptionCredentialInfo | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value) || !isRecord(value.oauthAccount)) {
    return null
  }
  const { emailAddress } = value.oauthAccount
  return { account: typeof emailAddress === 'string' ? emailAddress : undefined }
}

/**
 * ~/.codex/auth.json：存在 tokens（ChatGPT 订阅登录写入）即视为已订阅登录；
 * 仅有 OPENAI_API_KEY 属于 API Key 登录，不算订阅登录。
 */
export function parseCodexSubscription(raw: string): SubscriptionCredentialInfo | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value) || !isRecord(value.tokens)) {
    return null
  }
  const { tokens } = value
  if (typeof tokens.access_token !== 'string' && typeof tokens.refresh_token !== 'string') {
    return null
  }
  return { plan: codexPlanFromIdToken(tokens.id_token) }
}
