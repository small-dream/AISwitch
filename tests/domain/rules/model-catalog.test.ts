import { describe, expect, it } from 'vitest'

import { parseModelIds } from '@/domain/rules/model-catalog'

describe('parseModelIds · 网关响应容错', () => {
  it('OpenAI / Anthropic 风格 data[].id', () => {
    expect(parseModelIds({ data: [{ id: 'a' }, { id: 'b' }] })).toEqual(['a', 'b'])
  })

  it('models[] / 字符串数组 / 顶层数组均识别，去重保序', () => {
    expect(parseModelIds({ models: ['a', 'a', { slug: 'b' }] })).toEqual(['a', 'b'])
    expect(parseModelIds(['x', { name: 'y' }])).toEqual(['x', 'y'])
  })

  it('结构不符、非字符串或空白 id 一律忽略且不抛错', () => {
    expect(parseModelIds(null)).toEqual([])
    expect(parseModelIds('not-json')).toEqual([])
    expect(parseModelIds({ data: [{ id: 42 }, { id: '   ' }, {}, null] })).toEqual([])
  })
})
