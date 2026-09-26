import { describe, expect, it } from 'vitest'

import { mergeModelOptions, templateModelOptions } from '@/domain/rules/model-options'

describe('templateModelOptions · 按 Base URL 反查模板', () => {
  it('OpenCode Go：Codex 侧给 DeepSeek/Grok，Claude 侧给 MiniMax/Qwen', () => {
    const codex = templateModelOptions('codex', 'https://opencode.ai/zen/go/v1')
    const claude = templateModelOptions('claude-code', 'https://opencode.ai/zen/go')

    expect(codex).toContain('deepseek-v4.1-flash')
    expect(codex).toContain('grok-4.7')
    expect(claude).toContain('minimax-m3')
    expect(claude).not.toContain('deepseek-v4.1-flash')
  })

  it('忽略大小写、结尾斜杠与 CLI 自行追加的 /v1', () => {
    expect(templateModelOptions('codex', 'https://OpenCode.ai/zen/go/v1/')).toEqual(
      templateModelOptions('codex', 'https://opencode.ai/zen/go')
    )
  })

  it('自定义地址 / 空地址无候选，回落手填', () => {
    expect(templateModelOptions('codex', 'https://my-relay.example.com/v1')).toEqual([])
    expect(templateModelOptions('codex', undefined)).toEqual([])
    expect(templateModelOptions('codex', '')).toEqual([])
  })
})

describe('mergeModelOptions', () => {
  it('按传入顺序去重并保留首个位置', () => {
    expect(mergeModelOptions(['a', 'b'], ['b', 'c'], [' a '])).toEqual(['a', 'b', 'c'])
  })

  it('过滤空白项', () => {
    expect(mergeModelOptions(['', '   ', 'x'])).toEqual(['x'])
  })
})
