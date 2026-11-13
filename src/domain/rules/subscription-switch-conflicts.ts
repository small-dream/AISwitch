import type { CodexConfig } from '@/domain/schemas/codex-config'

/** Codex 切换官方订阅前必须由用户确认移除的冲突字段 */
export type CodexSubscriptionConflictKey = 'forced_login_method'

export interface CodexSubscriptionConflict {
  key: CodexSubscriptionConflictKey
  value: string
}

/**
 * 找出会让 Codex 无法使用 ChatGPT 订阅账号的有效冲突（PRD §5.13）。
 * 当前 Codex 已忽略 `preferred_auth_method`，因此不能把它当作阻断项；
 * 只有 `forced_login_method = "api"` 会强制 API Key 登录。
 */
export function findCodexSubscriptionConflicts(
  config: CodexConfig | null
): readonly CodexSubscriptionConflict[] {
  const forced = config?.forced_login_method
  if (forced?.trim().toLowerCase() !== 'api') {
    return []
  }
  return [{ key: 'forced_login_method', value: forced }]
}

/** 仅删除用户已确认的冲突字段；其余字段原样保留 */
export function stripCodexSubscriptionConflicts(
  config: CodexConfig,
  conflicts: readonly CodexSubscriptionConflict[]
): CodexConfig {
  const next = { ...config }
  for (const conflict of conflicts) {
    Reflect.deleteProperty(next, conflict.key)
  }
  return next
}
