import { describe, expect, it } from 'vitest'

import {
  parseClaudeCredentials,
  parseClaudeUserAccount,
  parseCodexSubscription,
} from '@/domain/rules/subscription-credentials'

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'RS256' })}.${encode(payload)}.signature`
}

describe('parseClaudeCredentials', () => {
  it('携带 OAuth token 时返回订阅类型与过期时间', () => {
    const info = parseClaudeCredentials(
      JSON.stringify({
        claudeAiOauth: {
          accessToken: 'sk-ant-oat-xxx',
          refreshToken: 'sk-ant-ort-xxx',
          subscriptionType: 'max',
          expiresAt: 1_770_000_000_000,
        },
      })
    )

    expect(info).toEqual({ plan: 'Max', expiresAt: '2026-02-02T02:40:00.000Z' })
  })

  it('秒级时间戳归一到 ISO', () => {
    const info = parseClaudeCredentials(
      JSON.stringify({ claudeAiOauth: { accessToken: 'a', expiresAt: 1_770_000_000 } })
    )

    expect(info?.expiresAt).toBe('2026-02-02T02:40:00.000Z')
  })

  it('仅 refreshToken 也算已登录', () => {
    const info = parseClaudeCredentials(
      JSON.stringify({ claudeAiOauth: { refreshToken: 'sk-ant-ort-xxx' } })
    )
    expect(info).toEqual({ plan: undefined, expiresAt: undefined })
  })

  it('无 claudeAiOauth / 非法 JSON / 空 token 返回 null', () => {
    expect(parseClaudeCredentials(JSON.stringify({ other: 1 }))).toBeNull()
    expect(parseClaudeCredentials('{oops')).toBeNull()
    expect(parseClaudeCredentials(JSON.stringify({ claudeAiOauth: { scopes: [] } }))).toBeNull()
  })
})

describe('parseClaudeUserAccount', () => {
  it('oauthAccount 存在时取邮箱（macOS 钥匙串场景的兜底信号）', () => {
    const info = parseClaudeUserAccount(
      JSON.stringify({
        oauthAccount: { emailAddress: 'dev@example.com', organizationName: 'Acme' },
      })
    )

    expect(info).toEqual({ account: 'dev@example.com' })
  })

  it('oauthAccount 缺失（已登出）或非法 JSON 返回 null', () => {
    expect(parseClaudeUserAccount(JSON.stringify({ projects: {} }))).toBeNull()
    expect(parseClaudeUserAccount(JSON.stringify({ oauthAccount: null }))).toBeNull()
    expect(parseClaudeUserAccount('{oops')).toBeNull()
  })
})

describe('parseCodexSubscription', () => {
  it('tokens 存在时视为订阅登录，并从 id_token 解出套餐', () => {
    const idToken = jwt({
      'https://api.openai.com/auth': { chatgpt_plan_type: 'plus' },
    })
    const info = parseCodexSubscription(
      JSON.stringify({ OPENAI_API_KEY: null, tokens: { access_token: 'a', id_token: idToken } })
    )

    expect(info).toEqual({ plan: 'Plus' })
  })

  it('id_token 无法解析时仍判定已登录（仅缺套餐展示）', () => {
    const info = parseCodexSubscription(
      JSON.stringify({ tokens: { refresh_token: 'r', id_token: 'broken' } })
    )
    expect(info).toEqual({ plan: undefined })
  })

  it('仅 OPENAI_API_KEY（API Key 登录）不算订阅登录', () => {
    expect(parseCodexSubscription(JSON.stringify({ OPENAI_API_KEY: 'sk-x' }))).toBeNull()
    expect(parseCodexSubscription(JSON.stringify({ Tokens: [] }))).toBeNull()
    expect(parseCodexSubscription('{oops')).toBeNull()
  })
})
