import { describe, expect, it } from 'vitest'

import { claudeProjectStatus, codexProjectStatus } from '@/domain/rules/project-tool-status'

describe('claudeProjectStatus', () => {
  it('自定义中转：展示名与生效 URL 都取 ANTHROPIC_BASE_URL', () => {
    const status = claudeProjectStatus('claude-code', {
      env: { ANTHROPIC_BASE_URL: 'https://relay.example.com', ANTHROPIC_MODEL: 'glm-4.6' },
    })

    expect(status).toEqual({
      tool: 'claude-code',
      status: 'installed',
      activeModel: 'glm-4.6',
      activeProviderName: 'https://relay.example.com',
      activeProviderUrl: 'https://relay.example.com',
    })
  })

  it('官方：无 base URL 时展示名为官方 API，生效 URL 为空', () => {
    const status = claudeProjectStatus('claude-code', { model: 'sonnet' })

    expect(status).toMatchObject({ activeModel: 'sonnet', activeProviderName: '官方 API' })
    expect(status.activeProviderUrl).toBeUndefined()
  })
})

describe('codexProjectStatus', () => {
  it('自定义 provider：生效 URL 取块内 base_url（展示名仍旧是 provider id）', () => {
    const status = codexProjectStatus('codex', {
      model: 'deepseek-v4-pro',
      model_provider: 'deepseek',
      model_providers: {
        deepseek: { base_url: 'https://api.deepseek.com/v1', name: 'DeepSeek' },
      },
    })

    expect(status).toMatchObject({
      activeModel: 'deepseek-v4-pro',
      activeProviderName: 'deepseek',
      activeProviderUrl: 'https://api.deepseek.com/v1',
    })
  })

  it('官方 openai：生效 URL 为空（不参与自定义供应商判定）', () => {
    const status = codexProjectStatus('codex', { model: 'gpt-5', model_provider: 'openai' })

    expect(status.activeProviderUrl).toBeUndefined()
  })
})
