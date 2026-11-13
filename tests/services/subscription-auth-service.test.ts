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
    clearManaged: () =>
      Promise.resolve({ tool, appliedAt: '2026-08-14T00:00:00.000Z' } satisfies ApplyResult),
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

  it('支持直接登录的工具把请求委派给适配器', async () => {
    const startSubscriptionLogin = vi.fn(() => Promise.resolve())
    const target: ConfigTarget = { ...stubTarget('codex'), startSubscriptionLogin }
    const service = new SubscriptionAuthService(() => target)

    await service.startLogin('codex')

    expect(startSubscriptionLogin).toHaveBeenCalledOnce()
  })

  it('不支持直接登录的工具抛出明确错误', async () => {
    const service = new SubscriptionAuthService(() => stubTarget('claude-code'))

    await expect(service.startLogin('claude-code')).rejects.toMatchObject({
      code: 'E_TARGET_NOT_SUPPORTED',
      message: '该工具暂不支持直接启动登录',
    })
  })
})
