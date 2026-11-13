import { describe, expect, it } from 'vitest'

import { resolveCodexLoginState } from '@/domain/rules/codex-login-status'
import type { CodexCliResult } from '@/types/codex-cli-port'

function ran(stderr: string, exitCode = 0): CodexCliResult {
  return { status: 'ran', stdout: '', stderr, exitCode }
}

describe('resolveCodexLoginState', () => {
  it('CLI 明确 ChatGPT 登录 → 已登录', () => {
    expect(resolveCodexLoginState(ran('Logged in using ChatGPT'), false)).toBe('logged-in')
  })

  it('CLI 明确未登录或 API Key → 未登录', () => {
    expect(resolveCodexLoginState(ran('Not logged in', 1), false)).toBe('logged-out')
    expect(resolveCodexLoginState(ran('API key configured - oc_sk_***'), true)).toBe('logged-out')
  })

  it('CLI 不可用时 tokens 只能作为已登录辅助证据', () => {
    expect(resolveCodexLoginState({ status: 'unavailable', reason: 'missing' }, true)).toBe(
      'logged-in'
    )
    expect(resolveCodexLoginState({ status: 'unavailable', reason: 'missing' }, false)).toBe(
      'unknown'
    )
  })

  it('CLI 输出无法识别且有 tokens → 已登录，否则未知', () => {
    expect(resolveCodexLoginState(ran('Error checking login status: boom', 1), true)).toBe(
      'logged-in'
    )
    expect(resolveCodexLoginState(ran('Error checking login status: boom', 1), false)).toBe(
      'unknown'
    )
  })
})
