import { describe, expect, it, vi } from 'vitest'

import { SubscriptionAuthService } from '@/services/subscription-auth-service'
import type { ApplyResult, ConfigTarget } from '@/types/config-target'

function stubTarget(tool: 'claude-code' | 'codex'): ConfigTarget {
  return {
    tool,
    detect: () => Promise.resolve({ tool, status: 'installed' }),
    apply: () =>
      Promise.resolve({ tool, appliedAt: '2026-08-14T00:00:00.000Z' } satisfies ApplyResult),
    verify: () => Promise.resolve(true),
    rollback: () => Promise.resolve(false),
    authStatus: () => Promise.resolve({ tool, state: 'logged-in', plan: 'Pro' }),
  }
}

describe('SubscriptionAuthService', () => {
  it('按工具委派给对应适配器（登录态只读探测）', async () => {
    const resolve = vi.fn(stubTarget)
    const service = new SubscriptionAuthService(resolve)

    expect(await service.status('codex')).toEqual({
      tool: 'codex',
      state: 'logged-in',
      plan: 'Pro',
    })
    expect(resolve).toHaveBeenCalledWith('codex')
  })
})
