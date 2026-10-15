import { describe, expect, it } from 'vitest'

import type { ToolStatus } from '@/domain/entities/preset'
import { isSubscriptionActive } from '@/domain/rules/subscription-active'
import { makePreset } from '../../helpers/make-preset'

function makeStatus(overrides: Partial<ToolStatus> = {}): ToolStatus {
  return { tool: 'claude-code', status: 'installed', activeProviderName: '官方 API', ...overrides }
}

describe('isSubscriptionActive', () => {
  it('未探测 / 未配置时不生效', () => {
    expect(isSubscriptionActive(undefined, [])).toBe(false)
    expect(isSubscriptionActive(makeStatus({ status: 'not-configured' }), [])).toBe(false)
  })

  it('当前在自定义中转上时不生效', () => {
    const status = makeStatus({ activeProviderName: 'https://relay.example.com/api' })
    expect(isSubscriptionActive(status, [])).toBe(false)
  })

  it('无托管覆盖：即便探测到模型中立值也视为订阅态生效', () => {
    const status = makeStatus({ activeModel: 'claude-sonnet-5' })
    expect(isSubscriptionActive(status, [])).toBe(true)
  })

  it('任一预设生效即不判为订阅态', () => {
    const preset = makePreset({ baseUrl: undefined })
    const status = makeStatus({ activeModel: 'glm-4.6' })
    expect(isSubscriptionActive(status, [preset])).toBe(false)
  })
})
