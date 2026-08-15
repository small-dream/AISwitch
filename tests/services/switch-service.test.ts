import { describe, expect, it } from 'vitest'

import { BackupManager } from '@/adapters/backup/backup-manager'
import { BaselineManager } from '@/adapters/baseline/baseline-manager'
import { PATHS } from '@/constants/paths'
import { PresetRepository } from '@/adapters/presets/preset-repository'
import { registerTarget } from '@/adapters/target-registry'
import { AppError } from '@/domain/errors'
import { SwitchService } from '@/services/switch-service'
import type { ApplyResult, ConfigTarget } from '@/types/config-target'
import { makePreset } from '../helpers/make-preset'
import { createMemoryFs } from '../helpers/memory-fs'

function setup() {
  const fs = createMemoryFs()
  const repo = new PresetRepository(fs)
  const baselines = new BaselineManager(fs, new BackupManager(fs))
  const applied: string[] = []
  const target: ConfigTarget = {
    tool: 'claude-code',
    detect: () => Promise.resolve({ tool: 'claude-code', status: 'installed' }),
    apply: (preset) => {
      applied.push(preset.id)
      const result: ApplyResult = { tool: 'claude-code', appliedAt: new Date().toISOString() }
      return Promise.resolve(result)
    },
    verify: () => Promise.resolve(true),
    rollback: () => Promise.resolve(true),
  }
  registerTarget(target)
  return { fs, repo, baselines, service: new SwitchService(repo, baselines), applied }
}

describe('SwitchService', () => {
  it('加载预设并委托给对应目标工具', async () => {
    const { repo, service, applied } = setup()
    const preset = makePreset()
    await repo.save({ version: 1, presets: [preset] })

    const result = await service.switch('claude-code', preset.id)

    expect(result.tool).toBe('claude-code')
    expect(applied).toEqual([preset.id])
  })

  it('预设不存在抛出 E_PRESET_NOT_FOUND', async () => {
    const { service } = setup()
    await expect(service.switch('claude-code', 'missing')).rejects.toMatchObject({
      code: 'E_PRESET_NOT_FOUND',
    })
  })

  it('预设与目标工具不匹配抛出 E_VALIDATION_FAILED', async () => {
    const { repo, service } = setup()
    await repo.save({ version: 1, presets: [makePreset({ tool: 'codex' })] })

    try {
      await service.switch('claude-code', 'preset-1')
      expect.unreachable('应当抛出 AppError')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('E_VALIDATION_FAILED')
    }
  })
})

describe('SwitchService 安装前基线挂钩', () => {
  it('首次切换前捕获基线一次，二次切换不重复捕获', async () => {
    const { repo, service, baselines } = setup()
    const preset = makePreset()
    await repo.save({ version: 1, presets: [preset] })

    await service.switch('claude-code', preset.id)
    const manifest = await baselines.manifest()
    const capturedAt = manifest.tools['claude-code']?.files[PATHS.claudeSettings]?.capturedAt
    expect(capturedAt).toBeTruthy()

    await service.switch('claude-code', preset.id)
    const again = await baselines.manifest()
    expect(again.tools['claude-code']?.files[PATHS.claudeSettings]?.capturedAt).toBe(capturedAt)
  })

  it('基线捕获失败只降级告警，不阻断切换', async () => {
    const { repo, applied } = setup()
    const preset = makePreset()
    await repo.save({ version: 1, presets: [preset] })
    const failing = {
      captureIfAbsent: () => Promise.reject(new Error('disk full')),
    }
    const service = new SwitchService(repo, failing as unknown as BaselineManager)

    const result = await service.switch('claude-code', preset.id)

    expect(result.tool).toBe('claude-code')
    expect(applied).toEqual([preset.id])
  })
})
