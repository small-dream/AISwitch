import { parse as parseToml } from 'smol-toml'
import { describe, expect, it } from 'vitest'

import { createCodexTarget } from '@/adapters/codex'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'

const AUTH_FIXTURE = JSON.stringify({ OPENAI_API_KEY: 'sk-old', Tokens: [] })
const OWN_CONFIG = [
  'model = "deepseek-v4-pro"',
  'model_provider = "deepseek"',
  'forced_login_method = "api"',
  'preferred_auth_method = "apikey"',
  '',
  '[model_providers.deepseek]',
  'name = "DeepSeek"',
  'base_url = "https://api.deepseek.com/v1"',
  'wire_api = "responses"',
  '',
].join('\n')

function conflictFs(): MemoryFs {
  return createMemoryFs({
    '.codex/config.toml': OWN_CONFIG,
    '.codex/auth.json': AUTH_FIXTURE,
  })
}

function readToml(fs: MemoryFs): Record<string, unknown> {
  return parseToml(fs.files().get('.codex/config.toml') ?? '')
}

describe('CodexConfigTarget · 官方订阅冲突字段', () => {
  it('未确认冲突时拒绝切换且原文件一个字节都不改', async () => {
    const fs = conflictFs()
    const target = createCodexTarget(fs)

    await expect(target.clearManaged()).rejects.toMatchObject({
      code: 'E_SUBSCRIPTION_CONFLICT_REQUIRED',
      context: { conflicts: [{ key: 'forced_login_method', value: 'api' }] },
    })
    expect(fs.files().get('.codex/config.toml')).toBe(OWN_CONFIG)
  })

  it('确认后先备份再删除强制登录字段，保留用户模型与自建 provider', async () => {
    const fs = conflictFs()
    const result = await createCodexTarget(fs).clearManaged({ removeConflicts: true })
    const config = readToml(fs)

    expect(result.backupPath).toBeTruthy()
    expect(config.model).toBe('deepseek-v4-pro')
    expect(config.model_provider).toBe('deepseek')
    expect(config.forced_login_method).toBeUndefined()
    expect(config.preferred_auth_method).toBe('apikey')
    const providers = config.model_providers as Record<string, unknown>
    expect(providers.deepseek).toMatchObject({ name: 'DeepSeek' })
    expect(result.writtenFiles).toEqual(['.codex/config.toml', '.codex/auth.json'])
  })

  it('只有已废弃的 preferred_auth_method 时不触发冲突', async () => {
    const fs = createMemoryFs({
      '.codex/config.toml': 'preferred_auth_method = "apikey"\n',
    })

    expect(await createCodexTarget(fs).subscriptionConflicts?.()).toEqual([])
  })
})
