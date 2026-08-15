import { describe, expect, it } from 'vitest'

import { isAllowedBaseUrl } from '@/domain/rules/base-url'

describe('isAllowedBaseUrl', () => {
  it('留空 / undefined 表示官方 API，恒为允许', () => {
    expect(isAllowedBaseUrl('')).toBe(true)
    expect(isAllowedBaseUrl(undefined)).toBe(true)
  })

  it('https 任意主机允许（用户中转站域名不可枚举）', () => {
    expect(isAllowedBaseUrl('https://open.bigmodel.cn/api/anthropic')).toBe(true)
    expect(isAllowedBaseUrl('https://relay.example.com:8443')).toBe(true)
  })

  it('http 仅允许本机回环', () => {
    expect(isAllowedBaseUrl('http://localhost')).toBe(true)
    expect(isAllowedBaseUrl('http://localhost:11434')).toBe(true)
    expect(isAllowedBaseUrl('http://127.0.0.1')).toBe(true)
    expect(isAllowedBaseUrl('http://127.0.0.1:3000')).toBe(true)
    expect(isAllowedBaseUrl('http://[::1]')).toBe(true)
    expect(isAllowedBaseUrl('http://[::1]:8080')).toBe(true)
  })

  it('http 非回环一律拒绝', () => {
    expect(isAllowedBaseUrl('http://example.com')).toBe(false)
    expect(isAllowedBaseUrl('http://192.168.1.5:8080')).toBe(false)
    expect(isAllowedBaseUrl('http://[::2]')).toBe(false)
  })

  it('回环前缀伪装必须拒绝', () => {
    expect(isAllowedBaseUrl('http://localhost.evil.com')).toBe(false)
    expect(isAllowedBaseUrl('http://127.0.0.1.evil.com')).toBe(false)
  })

  it('非 http(s) 协议与非法 URL 拒绝', () => {
    expect(isAllowedBaseUrl('ftp://example.com')).toBe(false)
    expect(isAllowedBaseUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedBaseUrl('not a url')).toBe(false)
  })
})
