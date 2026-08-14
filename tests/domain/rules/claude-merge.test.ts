import { describe, expect, it } from 'vitest'

import { CLAUDE_ENV_KEYS } from '@/constants/config-keys'
import { expectedClaudeEnv, mergeClaudeSettings } from '@/domain/rules/claude-merge'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import { makePreset } from '../../helpers/make-preset'

const CURRENT: ClaudeSettings = {
  env: {
    ANTHROPIC_MODEL: 'old-model',
    ANTHROPIC_AUTH_TOKEN: 'old-token',
    ANTHROPIC_BASE_URL: 'https://old.example.com',
    ANTHROPIC_SMALL_FAST_MODEL: 'old-small',
    OTHER_KEY: 'keep-me',
  },
  permissions: { allow: ['Bash'] },
}

describe('mergeClaudeSettings', () => {
  it('覆盖 PRD 所列键并保留未知字段', () => {
    const preset = makePreset()
    const merged = mergeClaudeSettings(CURRENT, preset)

    expect(merged.env?.[CLAUDE_ENV_KEYS.model]).toBe(preset.model)
    expect(merged.env?.[CLAUDE_ENV_KEYS.authToken]).toBe(preset.apiKey)
    expect(merged.env?.[CLAUDE_ENV_KEYS.baseUrl]).toBe(preset.baseUrl)
    expect(merged.env?.OTHER_KEY).toBe('keep-me')
    expect(merged.permissions).toEqual({ allow: ['Bash'] })
  })

  it('官方 API（无 baseUrl）时删除 BASE_URL 键', () => {
    const preset = makePreset({ baseUrl: undefined })
    const merged = mergeClaudeSettings(CURRENT, preset)

    expect(CLAUDE_ENV_KEYS.baseUrl in (merged.env ?? {})).toBe(false)
  })

  it('smallFastModel 为空时删除该键', () => {
    const preset = makePreset({ smallFastModel: undefined })
    const merged = mergeClaudeSettings(CURRENT, preset)

    expect(CLAUDE_ENV_KEYS.smallFastModel in (merged.env ?? {})).toBe(false)
  })

  it('expectedClaudeEnv 与空基线合并结果一致', () => {
    const preset = makePreset({ smallFastModel: 'glm-4.6-air' })
    const fromEmpty = mergeClaudeSettings({}, preset).env ?? {}

    expect(expectedClaudeEnv(preset)).toEqual(fromEmpty)
  })
})
