import { describe, expect, it } from 'vitest'

import { subscriptionSwitchBlock } from '@/domain/rules/subscription-switch-guard'

describe('subscriptionSwitchBlock', () => {
  it('Codex 未登录时拦截切换', () => {
    expect(subscriptionSwitchBlock('codex', { tool: 'codex', state: 'logged-out' })).toBe(
      'logged-out'
    )
  })

  it('Codex 登录态无法确认时同样拦截', () => {
    expect(subscriptionSwitchBlock('codex', { tool: 'codex', state: 'unknown' })).toBe('unknown')
  })

  it('Codex 已登录时放行', () => {
    expect(subscriptionSwitchBlock('codex', { tool: 'codex', state: 'logged-in' })).toBeNull()
  })

  it('Claude Code 不硬拦截（钥匙串探测可能假阴性）', () => {
    expect(
      subscriptionSwitchBlock('claude-code', { tool: 'claude-code', state: 'logged-out' })
    ).toBeNull()
  })
})
