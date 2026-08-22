import { describe, expect, it } from 'vitest'

import { relativeToHome } from '@/adapters/system/directory-picker'

describe('directory picker path mapping', () => {
  it('将主目录下的绝对路径转换为相对路径', () => {
    expect(relativeToHome('/Users/jake/repos/demo', '/Users/jake')).toBe('repos/demo')
    expect(relativeToHome('C:\\Users\\jake\\repos\\demo', 'C:\\Users\\jake')).toBe('repos/demo')
  })

  it('拒绝主目录本身和主目录之外的路径', () => {
    expect(() => relativeToHome('/Users/jake', '/Users/jake')).toThrow('具体的项目目录')
    expect(() => relativeToHome('/tmp/demo', '/Users/jake')).toThrow('用户主目录下')
  })
})
