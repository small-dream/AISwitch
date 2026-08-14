import { describe, expect, it } from 'vitest'
import { maskApiKey } from '@/utils/mask'

describe('maskApiKey', () => {
  it('长 Key 保留首尾各 4 位，中间以星号填充', () => {
    expect(maskApiKey('sk-ant-api03-abcdef1234567890')).toBe('sk-a******7890')
  })

  it('长度不超过两倍 visibleEnds 时全部遮蔽', () => {
    expect(maskApiKey('short')).toBe('*****')
  })

  it('支持自定义保留位数', () => {
    expect(maskApiKey('sk-1234567890abcdef', 6)).toBe('sk-123******abcdef')
  })

  it('空字符串返回空字符串', () => {
    expect(maskApiKey('')).toBe('')
  })
})
