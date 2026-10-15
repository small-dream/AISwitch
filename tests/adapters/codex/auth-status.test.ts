import { describe, expect, it } from 'vitest'

import { detectCodexAuth } from '@/adapters/codex/auth-status'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'

describe('detectCodexAuth', () => {
  it('auth.json 含 tokens → 已订阅登录', async () => {
    const fs = createMemoryFs({
      '.codex/auth.json': JSON.stringify({ tokens: { access_token: 'a' } }),
    })

    expect(await detectCodexAuth(fs)).toEqual({
      tool: 'codex',
      state: 'logged-in',
      plan: undefined,
    })
  })

  it('只有 OPENAI_API_KEY（API Key 登录）→ 未订阅登录', async () => {
    const fs = createMemoryFs({ '.codex/auth.json': JSON.stringify({ OPENAI_API_KEY: 'sk-x' }) })

    expect(await detectCodexAuth(fs)).toEqual({ tool: 'codex', state: 'logged-out' })
  })

  it('auth.json 不存在 → 未登录', async () => {
    expect(await detectCodexAuth(createMemoryFs())).toEqual({ tool: 'codex', state: 'logged-out' })
  })

  it('读取失败 → unknown', async () => {
    const fs: MemoryFs = createMemoryFs({ '.codex/auth.json': '{"tokens":{}}' })
    fs.readTextFile = () => Promise.reject(new Error('EACCES'))

    expect(await detectCodexAuth(fs)).toEqual({ tool: 'codex', state: 'unknown' })
  })
})
