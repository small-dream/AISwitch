import { describe, expect, it } from 'vitest'

import { groupModelOptions, templateModelOptions } from '@/domain/rules/model-options'

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

describe('groupModelOptions · 按来源拆分候选', () => {
  it('目录里与推荐重复的条目只留在推荐组，两组各自保持原顺序', () => {
    expect(groupModelOptions(['a', 'b'], ['b', 'c', 'a', 'd'])).toEqual({
      recommended: ['a', 'b'],
      catalog: ['c', 'd'],
    })
  })

  it('过滤空白项并在组内去重', () => {
    expect(groupModelOptions([' a ', '', 'a'], ['a', '   ', 'b'])).toEqual({
      recommended: ['a'],
      catalog: ['b'],
    })
  })

  it('自定义地址（无推荐）时目录原样保留', () => {
    expect(groupModelOptions([], ['x', 'y'])).toEqual({ recommended: [], catalog: ['x', 'y'] })
  })
})
