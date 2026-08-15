import { describe, expect, it } from 'vitest'

import { CLAUDE_ENV_KEYS, CLAUDE_SLOT_KEYS } from '@/constants/config-keys'
import {
  expectedClaudeEnv,
  isSlotModeEnv,
  mergeClaudeSettings,
  stripManagedClaudeKeys,
} from '@/domain/rules/claude-merge'
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

const SLOT_CURRENT: ClaudeSettings = {
  env: {
    ANTHROPIC_AUTH_TOKEN: 'old-token',
    ANTHROPIC_BASE_URL: 'https://old.example.com',
    [CLAUDE_SLOT_KEYS.sonnet]: 'old-sonnet',
    [CLAUDE_SLOT_KEYS.opus]: 'old-opus',
    [CLAUDE_SLOT_KEYS.haiku]: 'old-haiku',
  },
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
})

describe('槽位映射模式', () => {
  it('检测到槽位键即进入槽位模式', () => {
    expect(isSlotModeEnv(SLOT_CURRENT.env)).toBe(true)
    expect(isSlotModeEnv(CURRENT.env)).toBe(false)
    expect(isSlotModeEnv(undefined)).toBe(false)
  })

  it('槽位模式下三槽位同步覆盖，HAIKU 优先用小模型', () => {
    const preset = makePreset({ smallFastModel: 'glm-4.6-air' })
    const merged = mergeClaudeSettings(SLOT_CURRENT, preset)

    expect(merged.env?.[CLAUDE_SLOT_KEYS.sonnet]).toBe('glm-4.6')
    expect(merged.env?.[CLAUDE_SLOT_KEYS.opus]).toBe('glm-4.6')
    expect(merged.env?.[CLAUDE_SLOT_KEYS.haiku]).toBe('glm-4.6-air')
  })

  it('无小模型时 HAIKU 槽位写主模型', () => {
    const merged = mergeClaudeSettings(SLOT_CURRENT, makePreset())
    expect(merged.env?.[CLAUDE_SLOT_KEYS.haiku]).toBe('glm-4.6')
  })

  it('非槽位模式不写槽位键', () => {
    const merged = mergeClaudeSettings(CURRENT, makePreset())
    expect(CLAUDE_SLOT_KEYS.sonnet in (merged.env ?? {})).toBe(false)
  })

  it('expectedClaudeEnv 与空基线合并一致（两种模式）', () => {
    const preset = makePreset()
    expect(expectedClaudeEnv(preset, false)).toEqual(mergeClaudeSettings({}, preset).env ?? {})

    const slotExpected = expectedClaudeEnv(preset, true)
    expect(slotExpected[CLAUDE_SLOT_KEYS.sonnet]).toBe('glm-4.6')
    expect(slotExpected[CLAUDE_SLOT_KEYS.haiku]).toBe('glm-4.6')
  })
})

describe('stripManagedClaudeKeys', () => {
  it('删除全部托管键，保留用户自有键与顶层字段', () => {
    const stripped = stripManagedClaudeKeys(mergeClaudeSettings(CURRENT, makePreset()))

    for (const key of [
      CLAUDE_ENV_KEYS.authToken,
      CLAUDE_ENV_KEYS.model,
      CLAUDE_ENV_KEYS.baseUrl,
      CLAUDE_ENV_KEYS.smallFastModel,
    ]) {
      expect(key in (stripped.env ?? {})).toBe(false)
    }
    expect(stripped.env?.OTHER_KEY).toBe('keep-me')
    expect(stripped.permissions).toEqual({ allow: ['Bash'] })
  })

  it('槽位键同样被剥离（与切换写入的键集互为逆操作）', () => {
    const stripped = stripManagedClaudeKeys(mergeClaudeSettings(SLOT_CURRENT, makePreset()))
    expect(CLAUDE_SLOT_KEYS.sonnet in (stripped.env ?? {})).toBe(false)
    expect(CLAUDE_SLOT_KEYS.opus in (stripped.env ?? {})).toBe(false)
    expect(CLAUDE_SLOT_KEYS.haiku in (stripped.env ?? {})).toBe(false)
  })

  it('env 剥空后移除 env 键本身；无 env 时原样返回', () => {
    expect('env' in stripManagedClaudeKeys({ env: { ANTHROPIC_MODEL: 'x' } })).toBe(false)
    expect(stripManagedClaudeKeys({ permissions: { allow: [] } })).toEqual({
      permissions: { allow: [] },
    })
  })
})
