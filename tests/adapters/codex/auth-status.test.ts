import { describe, expect, it } from 'vitest'

import { detectCodexAuth } from '@/adapters/codex/auth-status'
import type { CodexCliPort, CodexCliResult } from '@/types/codex-cli-port'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'

function cli(result: CodexCliResult): CodexCliPort {
  return { loginStatus: () => Promise.resolve(result) }
}

const CHATGPT: CodexCliResult = {
  status: 'ran',
  stdout: '',
  stderr: 'Logged in using ChatGPT',
  exitCode: 0,
}
const API_KEY: CodexCliResult = {
  status: 'ran',
  stdout: '',
  stderr: 'API key configured - oc_sk_***',
  exitCode: 0,
}
const LOGGED_OUT: CodexCliResult = {
  status: 'ran',
  stdout: '',
  stderr: 'Not logged in',
  exitCode: 1,
}
const UNAVAILABLE: CodexCliResult = { status: 'unavailable', reason: 'missing' }

describe('detectCodexAuth', () => {
  it('CLI 明确 ChatGPT 登录 → 已订阅登录（可附带 auth.json 的套餐信息）', async () => {
    const fs = createMemoryFs({
      '.codex/auth.json': JSON.stringify({ tokens: { access_token: 'a' } }),
    })

    expect(await detectCodexAuth(fs, cli(CHATGPT))).toEqual({
      tool: 'codex',
      state: 'logged-in',
      plan: undefined,
      hasSubscriptionCredentials: true,
    })
  })

  it('没有 auth.json 但 CLI 已 ChatGPT 登录（钥匙串）→ 已登录', async () => {
    expect(await detectCodexAuth(createMemoryFs(), cli(CHATGPT))).toEqual({
      tool: 'codex',
      state: 'logged-in',
    })
  })

  it('CLI 明确 API Key → 未订阅登录，就算 auth.json 尚存 tokens 也保留辅助证据', async () => {
    const fs = createMemoryFs({
      '.codex/auth.json': JSON.stringify({ tokens: { access_token: 'a' } }),
    })

    expect(await detectCodexAuth(fs, cli(API_KEY))).toEqual({
      tool: 'codex',
      state: 'logged-out',
      hasSubscriptionCredentials: true,
    })
  })

  it('CLI 明确未登录 → 未订阅登录', async () => {
    expect(await detectCodexAuth(createMemoryFs(), cli(LOGGED_OUT))).toEqual({
      tool: 'codex',
      state: 'logged-out',
    })
  })
})

describe('detectCodexAuth · CLI 不可用时的辅助证据', () => {
  it('CLI 不可用：有 tokens 按辅助证据判已登录，无 tokens 判未知', async () => {
    const withTokens = createMemoryFs({
      '.codex/auth.json': JSON.stringify({ tokens: { refresh_token: 'r' } }),
    })

    expect(await detectCodexAuth(withTokens, cli(UNAVAILABLE))).toMatchObject({
      state: 'logged-in',
      hasSubscriptionCredentials: true,
    })
    expect(await detectCodexAuth(createMemoryFs(), cli(UNAVAILABLE))).toEqual({
      tool: 'codex',
      state: 'unknown',
    })
  })

  it('auth.json 读取失败且 CLI 可判定时仍以 CLI 为准', async () => {
    const fs: MemoryFs = createMemoryFs({ '.codex/auth.json': '{"tokens":{}}' })
    fs.readTextFile = () => Promise.reject(new Error('EACCES'))

    expect(await detectCodexAuth(fs, cli(CHATGPT))).toEqual({ tool: 'codex', state: 'logged-in' })
  })
})
