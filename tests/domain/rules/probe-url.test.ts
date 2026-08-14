import { describe, expect, it } from 'vitest'

import { makePreset } from '../../helpers/make-preset'
import { buildProbeUrl } from '@/domain/rules/probe-url'

describe('buildProbeUrl', () => {
  it('Claude 第三方：base + /v1/models', () => {
    const preset = makePreset({ baseUrl: 'https://relay.example.com' })
    expect(buildProbeUrl(preset)).toBe('https://relay.example.com/v1/models')
  })

  it('Claude 官方：使用 api.anthropic.com', () => {
    const preset = makePreset({ baseUrl: undefined })
    expect(buildProbeUrl(preset)).toBe('https://api.anthropic.com/v1/models')
  })

  it('Codex base 已含 /v1：直接追加 /models', () => {
    const preset = makePreset({ tool: 'codex', baseUrl: 'https://api.openai.com/v1' })
    expect(buildProbeUrl(preset)).toBe('https://api.openai.com/v1/models')
  })

  it('Codex base 不含 /v1：自动补齐', () => {
    const preset = makePreset({ tool: 'codex', baseUrl: 'https://relay.example.com' })
    expect(buildProbeUrl(preset)).toBe('https://relay.example.com/v1/models')
  })

  it('自动去除尾部斜杠', () => {
    const preset = makePreset({ baseUrl: 'https://relay.example.com/' })
    expect(buildProbeUrl(preset)).toBe('https://relay.example.com/v1/models')
  })
})
