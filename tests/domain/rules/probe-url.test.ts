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

  it('Claude base 自带 /v1：先去掉再补，避免 /v1/v1/models', () => {
    const preset = makePreset({ baseUrl: 'http://127.0.0.1:1234/v1' })
    expect(buildProbeUrl(preset)).toBe('http://127.0.0.1:1234/v1/models')
  })

  it('Claude base 自带 /v2：同样归一化到 /v1/models', () => {
    const preset = makePreset({ baseUrl: 'https://relay.example.com/v2' })
    expect(buildProbeUrl(preset)).toBe('https://relay.example.com/v1/models')
  })

  it('Codex base 已含 /v3、/v4：直接追加 /models（火山方舟 / 智谱）', () => {
    expect(
      buildProbeUrl(
        makePreset({ tool: 'codex', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3' })
      )
    ).toBe('https://ark.cn-beijing.volces.com/api/v3/models')
    expect(
      buildProbeUrl(makePreset({ tool: 'codex', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' }))
    ).toBe('https://open.bigmodel.cn/api/paas/v4/models')
  })
})
