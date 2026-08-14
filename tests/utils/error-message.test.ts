import { describe, expect, it } from 'vitest'

import { AppError } from '@/domain/errors'
import { errorMessage } from '@/utils/error-message'

describe('errorMessage', () => {
  it('AppError 显示其 message', () => {
    expect(errorMessage(new AppError('E_FS_WRITE', '写入失败'))).toBe('写入失败')
  })

  it('Tauri 插件的字符串错误原样透传', () => {
    expect(errorMessage('forbidden path: .jakeaitools')).toBe('forbidden path: .jakeaitools')
  })

  it('Error 取 message，未知类型兜底', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage(42)).toBe('发生未知错误')
    expect(errorMessage('')).toBe('发生未知错误')
  })
})
