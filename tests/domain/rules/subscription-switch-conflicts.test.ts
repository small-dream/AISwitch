import { describe, expect, it } from 'vitest'

import {
  findCodexSubscriptionConflicts,
  stripCodexSubscriptionConflicts,
} from '@/domain/rules/subscription-switch-conflicts'

describe('Codex 官方订阅冲突检测', () => {
  it('forced_login_method=api 是有效阻断冲突', () => {
    expect(findCodexSubscriptionConflicts({ forced_login_method: 'api' })).toEqual([
      { key: 'forced_login_method', value: 'api' },
    ])
  })

  it('chatgpt 登录方式、空配置与历史 preferred_auth_method 都不阻断', () => {
    expect(findCodexSubscriptionConflicts({ forced_login_method: 'chatgpt' })).toEqual([])
    expect(findCodexSubscriptionConflicts(null)).toEqual([])
    expect(findCodexSubscriptionConflicts({ preferred_auth_method: 'apikey' })).toEqual([])
  })

  it('只删除用户确认的冲突字段，其余配置保持不变', () => {
    const config = {
      model: 'deepseek-v4-pro',
      model_provider: 'deepseek',
      forced_login_method: 'api',
      preferred_auth_method: 'apikey',
    }

    expect(
      stripCodexSubscriptionConflicts(config, [{ key: 'forced_login_method', value: 'api' }])
    ).toEqual({
      model: 'deepseek-v4-pro',
      model_provider: 'deepseek',
      preferred_auth_method: 'apikey',
    })
  })
})
