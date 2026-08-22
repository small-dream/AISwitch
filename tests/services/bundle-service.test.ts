import { describe, expect, it } from 'vitest'

import { BackupManager } from '@/adapters/backup/backup-manager'
import { BaselineManager } from '@/adapters/baseline/baseline-manager'
import { BundleRepository } from '@/adapters/bundles/bundle-repository'
import { PresetRepository } from '@/adapters/presets/preset-repository'
import { registerTarget } from '@/adapters/target-registry'
import { AppError } from '@/domain/errors'
import type { BundleInput } from '@/domain/entities/bundle'
import { BundleService } from '@/services/bundle-service'
import { SwitchService } from '@/services/switch-service'
import type { ApplyResult, ConfigTarget } from '@/types/config-target'
import { makePreset } from '../helpers/make-preset'
import { createMemoryFs } from '../helpers/memory-fs'

function makeTarget(tool: 'claude-code' | 'codex', failingIds: Set<string>): ConfigTarget {
  return {
    tool,
    detect: () => Promise.resolve({ tool, status: 'installed' }),
    apply: (preset) => {
      if (failingIds.has(preset.id)) {
        return Promise.reject(new AppError('E_CONFIG_WRITE', '写入失败', {}))
      }
      const result: ApplyResult = { tool, appliedAt: new Date().toISOString() }
      return Promise.resolve(result)
    },
    verify: () => Promise.resolve(true),
    rollback: () => Promise.resolve(true),
  }
}

function setup(failingIds: Set<string> = new Set<string>()) {
  const fs = createMemoryFs()
  const presetRepo = new PresetRepository(fs)
  const bundleRepo = new BundleRepository(fs)
  const switchService = new SwitchService(
    presetRepo,
    new BaselineManager(fs, new BackupManager(fs))
  )
  registerTarget(makeTarget('claude-code', failingIds))
  registerTarget(makeTarget('codex', failingIds))
  return {
    bundleRepo,
    presetRepo,
    service: new BundleService(bundleRepo, presetRepo, switchService),
  }
}

async function seedPresets(presetRepo: PresetRepository): Promise<void> {
  await presetRepo.save({
    version: 1,
    presets: [makePreset({ id: 'p1' }), makePreset({ id: 'p2', tool: 'codex', model: 'gpt-5' })],
  })
}

function bundleInput(overrides: Partial<BundleInput> = {}): BundleInput {
  return { name: '全家 GLM', claudePresetId: 'p1', codexPresetId: 'p2', ...overrides }
}

describe('BundleService.create', () => {
  it('生成 id 与时间戳并持久化', async () => {
    const { service, bundleRepo, presetRepo } = setup()
    await seedPresets(presetRepo)
    const created = await service.create(bundleInput())

    expect(created.id).toBeTruthy()
    expect((await bundleRepo.list()).map((bundle) => bundle.id)).toEqual([created.id])
  })

  it('重名抛出 E_PRESET_DUPLICATE_NAME', async () => {
    const { service, presetRepo } = setup()
    await seedPresets(presetRepo)
    await service.create(bundleInput())
    await expect(service.create(bundleInput())).rejects.toMatchObject({
      code: 'E_PRESET_DUPLICATE_NAME',
    })
  })
})

describe('BundleService 引用完整性', () => {
  it('未选择任何工具抛出 E_VALIDATION_FAILED', async () => {
    const { service } = setup()
    await expect(
      service.create(bundleInput({ claudePresetId: undefined, codexPresetId: undefined }))
    ).rejects.toMatchObject({ code: 'E_VALIDATION_FAILED' })
  })

  it('引用不存在的预设抛出 E_PRESET_NOT_FOUND', async () => {
    const { service } = setup()
    await expect(service.create(bundleInput({ claudePresetId: 'missing' }))).rejects.toMatchObject({
      code: 'E_PRESET_NOT_FOUND',
    })
  })

  it('引用与目标工具不匹配抛出 E_VALIDATION_FAILED', async () => {
    const { service, presetRepo } = setup()
    await seedPresets(presetRepo)
    await expect(service.create(bundleInput({ claudePresetId: 'p2' }))).rejects.toMatchObject({
      code: 'E_VALIDATION_FAILED',
    })
  })
})

describe('BundleService.update / remove', () => {
  it('update 保留 id 与 createdAt', async () => {
    const { service, presetRepo } = setup()
    await seedPresets(presetRepo)
    const created = await service.create(bundleInput())
    const updated = await service.update(created.id, bundleInput({ name: '新组合' }))

    expect(updated.id).toBe(created.id)
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.name).toBe('新组合')
  })

  it('remove 不存在的组合抛出 E_PRESET_NOT_FOUND', async () => {
    const { service } = setup()
    await expect(service.remove('missing')).rejects.toMatchObject({
      code: 'E_PRESET_NOT_FOUND',
    })
  })
})

describe('BundleService.switch', () => {
  it('聚合切换全部工具成功', async () => {
    const { service, presetRepo } = setup()
    await seedPresets(presetRepo)
    const created = await service.create(bundleInput())

    const results = await service.switch(created.id)

    expect(results).toHaveLength(2)
    expect(results.every((result) => result.ok)).toBe(true)
  })

  it('某工具失败不阻断另一工具，结果如实标记', async () => {
    const { service, presetRepo } = setup(new Set<string>(['p1']))
    await seedPresets(presetRepo)
    const created = await service.create(bundleInput())

    const results = await service.switch(created.id)

    const claude = results.find((result) => result.tool === 'claude-code')
    const codex = results.find((result) => result.tool === 'codex')
    expect(claude?.ok).toBe(false)
    expect(claude?.error).toBe('写入失败')
    expect(codex?.ok).toBe(true)
  })

  it('仅配置单个工具时只切换该工具', async () => {
    const { service, presetRepo } = setup()
    await seedPresets(presetRepo)
    const created = await service.create(bundleInput({ codexPresetId: undefined }))

    const results = await service.switch(created.id)

    expect(results).toHaveLength(1)
    expect(results[0]?.tool).toBe('claude-code')
  })

  it('组合不存在抛出 E_PRESET_NOT_FOUND', async () => {
    const { service } = setup()
    await expect(service.switch('missing')).rejects.toMatchObject({
      code: 'E_PRESET_NOT_FOUND',
    })
  })
})
