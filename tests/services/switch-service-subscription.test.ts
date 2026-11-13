import { describe, expect, it } from 'vitest'

import { BackupManager } from '@/adapters/backup/backup-manager'
import { BaselineManager } from '@/adapters/baseline/baseline-manager'
import { PresetRepository } from '@/adapters/presets/preset-repository'
import { registerTarget } from '@/adapters/target-registry'
import type { SubscriptionLoginState } from '@/domain/entities/subscription-auth'
import type { CodexSubscriptionConflict } from '@/domain/rules/subscription-switch-conflicts'
import { SwitchService } from '@/services/switch-service'
import type { ClearManagedOptions, ConfigTarget } from '@/types/config-target'
import { createMemoryFs } from '../helpers/memory-fs'

function setup(
  state: SubscriptionLoginState,
  conflicts: readonly CodexSubscriptionConflict[] = [],
  hasSubscriptionCredentials = false,
  events: string[] = []
) {
  const fs = createMemoryFs()
  const repo = new PresetRepository(fs)
  const baselines = new BaselineManager(fs, new BackupManager(fs))
  let cleared = 0
  let clearOptions: ClearManagedOptions | undefined
  const target: ConfigTarget = {
    tool: 'codex',
    detect: () => Promise.resolve({ tool: 'codex', status: 'installed' }),
    apply: () => Promise.resolve({ tool: 'codex', appliedAt: 'now' }),
    verify: () => Promise.resolve(true),
    clearManaged: (options) => {
      events.push('clearManaged')
      cleared += 1
      clearOptions = options
      return Promise.resolve({ tool: 'codex', appliedAt: 'now' })
    },
    rollback: () => Promise.resolve(true),
    authStatus: () => Promise.resolve({ tool: 'codex', state, hasSubscriptionCredentials }),
    subscriptionConflicts: () => {
      events.push('subscriptionConflicts')
      return Promise.resolve(conflicts)
    },
    removeSubscriptionConflicts: () => {
      events.push('removeSubscriptionConflicts')
      return Promise.resolve({ tool: 'codex', appliedAt: 'now' })
    },
  }
  registerTarget(target)
  const service = new SwitchService(repo, baselines, () => {
    events.push('authStatus')
    return Promise.resolve({ tool: 'codex', state, hasSubscriptionCredentials })
  })
  return { service, events, cleared: () => cleared, clearOptions: () => clearOptions }
}

describe('SwitchService · Codex 官方订阅守卫', () => {
  it('未登录时拒绝切换，且不执行 clearManaged', async () => {
    const { service, cleared } = setup('logged-out')

    await expect(service.clearManaged('codex')).rejects.toMatchObject({
      code: 'E_SUBSCRIPTION_LOGIN_REQUIRED',
      context: { state: 'logged-out' },
    })
    expect(cleared()).toBe(0)
  })

  it('登录态无法确认时同样拒绝切换', async () => {
    const { service, cleared } = setup('unknown')

    await expect(service.clearManaged('codex')).rejects.toMatchObject({
      code: 'E_SUBSCRIPTION_LOGIN_REQUIRED',
      context: { state: 'unknown' },
    })
    expect(cleared()).toBe(0)
  })

  it('已登录时正常清空托管键', async () => {
    const { service, cleared } = setup('logged-in')

    await expect(service.clearManaged('codex')).resolves.toMatchObject({ tool: 'codex' })
    expect(cleared()).toBe(1)
  })
})

describe('SwitchService · Codex 官方订阅冲突确认', () => {
  it('发现冲突时先要求确认，且不执行 clearManaged', async () => {
    const { service, cleared } = setup('logged-in', [{ key: 'forced_login_method', value: 'api' }])

    await expect(service.clearManaged('codex')).rejects.toMatchObject({
      code: 'E_SUBSCRIPTION_CONFLICT_REQUIRED',
      context: { conflicts: [{ key: 'forced_login_method', value: 'api' }] },
    })
    expect(cleared()).toBe(0)
  })

  it('确认移除冲突后把选项传给适配器', async () => {
    const { service, cleared, clearOptions } = setup('logged-in', [
      { key: 'forced_login_method', value: 'api' },
    ])

    await expect(service.clearManaged('codex', { removeConflicts: true })).resolves.toMatchObject({
      tool: 'codex',
    })
    expect(cleared()).toBe(1)
    expect(clearOptions()).toEqual({ removeConflicts: true })
  })

  it('CLI 显示 API Key 但用户确认移除冲突且磁盘有 tokens → 允许切换', async () => {
    const { service, cleared } = setup(
      'logged-out',
      [{ key: 'forced_login_method', value: 'api' }],
      true
    )

    await expect(service.clearManaged('codex', { removeConflicts: true })).resolves.toMatchObject({
      tool: 'codex',
    })
    expect(cleared()).toBe(1)
  })
})

describe('SwitchService · Codex 冲突移除顺序与登录兜底', () => {
  it('确认移除冲突后按「检查 → 移除 → 登录检查 → 清理」顺序执行', async () => {
    const events: string[] = []
    const { service, cleared } = setup(
      'logged-in',
      [{ key: 'forced_login_method', value: 'api' }],
      false,
      events
    )

    await service.clearManaged('codex', { removeConflicts: true })

    expect(events).toEqual([
      'subscriptionConflicts',
      'removeSubscriptionConflicts',
      'authStatus',
      'clearManaged',
    ])
    expect(cleared()).toBe(1)
  })

  it('冲突已移除但登录仍无法确认时，不清理托管键，交给登录引导', async () => {
    const events: string[] = []
    const { service, cleared } = setup(
      'logged-out',
      [{ key: 'forced_login_method', value: 'api' }],
      false,
      events
    )

    await expect(service.clearManaged('codex', { removeConflicts: true })).rejects.toMatchObject({
      code: 'E_SUBSCRIPTION_LOGIN_REQUIRED',
      context: { state: 'logged-out' },
    })
    expect(events).toEqual(['subscriptionConflicts', 'removeSubscriptionConflicts', 'authStatus'])
    expect(cleared()).toBe(0)
  })

  it('CLI 显示 API Key 但磁盘仍有 tokens → 无需移除冲突也允许切换', async () => {
    const { service, cleared } = setup('logged-out', [], true)

    await expect(service.clearManaged('codex')).resolves.toMatchObject({ tool: 'codex' })
    expect(cleared()).toBe(1)
  })
})
