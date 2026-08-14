import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { createClaudeTarget } from '@/adapters/claude'
import { CLAUDE_ENV_KEYS } from '@/constants/config-keys'
import { makePreset } from '../../helpers/make-preset'
import { createMemoryFs } from '../../helpers/memory-fs'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures')
const SETTINGS_FIXTURE = readFileSync(join(FIXTURES, 'claude-settings.json'), 'utf8')

function parseSettings(raw: string | undefined): Record<string, unknown> {
  if (raw === undefined) {
    throw new Error('settings.json 未写入')
  }
  return JSON.parse(raw) as Record<string, unknown>
}

describe('ClaudeConfigTarget', () => {
  it('detect：未检测到全局配置（不判定为未安装，兼容 VS Code 插件场景）', async () => {
    const target = createClaudeTarget(createMemoryFs())
    expect(await target.detect()).toEqual({ tool: 'claude-code', status: 'not-configured' })
  })

  it('detect：读取当前模型与供应商', async () => {
    const target = createClaudeTarget(createMemoryFs({ '.claude/settings.json': SETTINGS_FIXTURE }))
    expect(await target.detect()).toEqual({
      tool: 'claude-code',
      status: 'installed',
      activeModel: 'claude-sonnet-4-5',
      activeProviderName: 'https://old-relay.example.com',
    })
  })

  it('detect：损坏配置归为 unknown', async () => {
    const target = createClaudeTarget(createMemoryFs({ '.claude/settings.json': '{broken' }))
    expect(await target.detect()).toEqual({ tool: 'claude-code', status: 'unknown' })
  })

  it('apply：写入预设键、保留未知字段、创建备份', async () => {
    const fs = createMemoryFs({ '.claude/settings.json': SETTINGS_FIXTURE })
    const target = createClaudeTarget(fs)
    const preset = makePreset()

    const result = await target.apply(preset)

    expect(result.tool).toBe('claude-code')
    expect(result.backupPath).toMatch(/--settings\.json$/)
    const written = parseSettings(fs.files().get('.claude/settings.json')) as {
      env: Record<string, string>
      permissions: unknown
    }
    expect(written.env[CLAUDE_ENV_KEYS.model]).toBe('glm-4.6')
    expect(written.env[CLAUDE_ENV_KEYS.authToken]).toBe('sk-test-key')
    expect(written.env.OTHER_KEY).toBe('keep-me')
    expect(written.permissions).toEqual({ allow: ['Bash'] })
    expect(await target.verify(preset)).toBe(true)
  })

  it('apply：首次（无既有配置）不产生备份且校验通过', async () => {
    const fs = createMemoryFs()
    const target = createClaudeTarget(fs)

    const result = await target.apply(makePreset())

    expect(result.backupPath).toBeUndefined()
    expect(await target.verify(makePreset())).toBe(true)
  })

  it('rollback：恢复最近一份备份', async () => {
    const fs = createMemoryFs({ '.claude/settings.json': SETTINGS_FIXTURE })
    const target = createClaudeTarget(fs)
    await target.apply(makePreset())

    expect(await target.rollback()).toBe(true)
    expect(fs.files().get('.claude/settings.json')).toBe(SETTINGS_FIXTURE)
  })
})
