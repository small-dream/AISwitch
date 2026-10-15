import { describe, expect, it } from 'vitest'

import { detectClaudeAuth } from '@/adapters/claude/auth-status'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'

const CREDENTIALS = JSON.stringify({
  claudeAiOauth: { accessToken: 'sk-ant-oat', subscriptionType: 'pro' },
})

describe('detectClaudeAuth', () => {
  it('凭据文件存在 → 已登录（带订阅类型）', async () => {
    const fs = createMemoryFs({ '.claude/.credentials.json': CREDENTIALS })

    expect(await detectClaudeAuth(fs)).toEqual({
      tool: 'claude-code',
      state: 'logged-in',
      plan: 'Pro',
      expiresAt: undefined,
    })
  })

  it('无凭据文件但 ~/.claude.json 记录账号（macOS 钥匙串场景）→ 已登录', async () => {
    const fs = createMemoryFs({
      '.claude.json': JSON.stringify({ oauthAccount: { emailAddress: 'dev@example.com' } }),
    })

    expect(await detectClaudeAuth(fs)).toEqual({
      tool: 'claude-code',
      state: 'logged-in',
      account: 'dev@example.com',
    })
  })

  it('两个来源都没有 → 未登录', async () => {
    expect(await detectClaudeAuth(createMemoryFs())).toEqual({
      tool: 'claude-code',
      state: 'logged-out',
    })
  })

  it('凭据文件损坏且无账号信息 → 未登录（不误报已登录）', async () => {
    const fs = createMemoryFs({ '.claude/.credentials.json': '{oops' })

    expect(await detectClaudeAuth(fs)).toEqual({ tool: 'claude-code', state: 'logged-out' })
  })

  it('读取失败 → unknown（交由用户在 CLI 内确认）', async () => {
    const fs: MemoryFs = createMemoryFs({ '.claude/.credentials.json': CREDENTIALS })
    fs.readTextFile = () => Promise.reject(new Error('EACCES'))

    expect(await detectClaudeAuth(fs)).toEqual({ tool: 'claude-code', state: 'unknown' })
  })
})
