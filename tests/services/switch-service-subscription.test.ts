import { describe, expect, it } from 'vitest'

import { BackupManager } from '@/adapters/backup/backup-manager'
import { BaselineManager } from '@/adapters/baseline/baseline-manager'
import { PresetRepository } from '@/adapters/presets/preset-repository'
import { registerTarget } from '@/adapters/target-registry'
import type { SubscriptionLoginState } from '@/domain/entities/subscription-auth'
import { SwitchService } from '@/services/switch-service'
import type { ConfigTarget } from '@/types/config-target'
import { createMemoryFs } from '../helpers/memory-fs'

function setup(state: SubscriptionLoginState) {
  const fs = createMemoryFs()
  const repo = new PresetRepository(fs)
  const baselines = new BaselineManager(fs, new BackupManager(fs))
  let cleared = 0
  const target: ConfigTarget = {
    tool: 'codex',
    detect: () => Promise.resolve({ tool: 'codex', status: 'installed' }),
    apply: () => Promise.resolve({ tool: 'codex', appliedAt: 'now' }),
    verify: () => Promise.resolve(true),
    clearManaged: () => {
      cleared += 1
      return Promise.resolve({ tool: 'codex', appliedAt: 'now' })
    },
    rollback: () => Promise.resolve(true),
    authStatus: () => Promise.resolve({ tool: 'codex', state }),
  }
  registerTarget(target)
  const service = new SwitchService(repo, baselines, () =>
    Promise.resolve({ tool: 'codex', state })
  )
  return { service, cleared: () => cleared }
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
