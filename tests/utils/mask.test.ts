import { describe, expect, it } from 'vitest'
import { maskApiKey } from '@/utils/mask'

describe('maskApiKey', () => {
  it('长 Key 保留首尾各 4 位，中间以星号填充', () => {
    expect(maskApiKey('sk-ant-api03-abcdef1234567890')).toBe('sk-a******7890')
  })

  it('长度不超过两倍 visibleEnds 时全部遮蔽', () => {
    expect(maskApiKey('short')).toBe('*****')
  })

  it('9-12 字符的短 Key 全部遮蔽（明文暴露不超过一半）', () => {
    expect(maskApiKey('123456789')).toBe('*********')
    expect(maskApiKey('1234567890')).toBe('**********')
    expect(maskApiKey('a'.repeat(12))).toBe('*'.repeat(12))
  })

  it('13 字符起才保留首尾各 4 位', () => {
    expect(maskApiKey('1234567890abc')).toBe('1234******0abc')
  })

  it('支持自定义保留位数', () => {
    expect(maskApiKey('sk-1234567890abcdef', 6)).toBe('sk-123******abcdef')
  })

  it('空字符串返回空字符串', () => {
    expect(maskApiKey('')).toBe('')
  })

  it('undefined（本地模型无 Key）返回空字符串', () => {
    expect(maskApiKey(undefined)).toBe('')
  })
})
