import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseToml } from 'smol-toml'
import { describe, expect, it } from 'vitest'

import { createCodexTarget } from '@/adapters/codex'
import { makePreset } from '../../helpers/make-preset'
import { createMemoryFs, MEMORY_HOME, type MemoryFs } from '../../helpers/memory-fs'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures')
const CONFIG_FIXTURE = readFileSync(join(FIXTURES, 'codex-config.toml'), 'utf8')
const AUTH_FIXTURE = readFileSync(join(FIXTURES, 'codex-auth.json'), 'utf8')
const MODELS_FIXTURE = readFileSync(join(FIXTURES, 'codex-models.json'), 'utf8')
const MANAGED_CATALOG = `${MEMORY_HOME}/.codex/models.json`

function readToml(fs: MemoryFs): Record<string, unknown> {
  return parseToml(fs.files().get('.codex/config.toml') ?? '')
}

describe('CodexConfigTarget · 第三方自定义模型与官方订阅往返', () => {
  it('切第三方建立目录指向；切官方移除；再切回重新建立', async () => {
    const fs = createMemoryFs({
      '.codex/config.toml': CONFIG_FIXTURE,
      '.codex/auth.json': AUTH_FIXTURE,
      '.codex/models.json': MODELS_FIXTURE,
      '.codex/models_cache.json': JSON.stringify({ models: [{ slug: 'gpt-6.2-sol' }] }),
    })
    const target = createCodexTarget(fs)
    const preset = makePreset({
      tool: 'codex',
      baseUrl: 'https://relay.example.com/v1',
      model: 'deepseek-v4.1-flash',
    })

    await target.apply(preset)
    expect(readToml(fs).model).toBe('deepseek-v4.1-flash')
    expect(readToml(fs).model_catalog_json).toBe(MANAGED_CATALOG)

    await target.clearManaged()
    expect(readToml(fs).model).toBeUndefined()
    expect(readToml(fs).model_provider).toBeUndefined()
    expect(readToml(fs).model_catalog_json).toBeUndefined()

    await target.apply(preset)
    expect(readToml(fs).model).toBe('deepseek-v4.1-flash')
    expect(readToml(fs).model_catalog_json).toBe(MANAGED_CATALOG)
    expect(await target.verify(preset)).toBe(true)
  })
})
