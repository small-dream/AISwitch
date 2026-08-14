import { describe, expect, it } from 'vitest'

import { PresetRepository } from '@/adapters/presets/preset-repository'
import { PresetService } from '@/services/preset-service'
import { makePresetInput } from '../helpers/make-preset'
import { createMemoryFs } from '../helpers/memory-fs'

function createService() {
  const repo = new PresetRepository(createMemoryFs())
  return { repo, service: new PresetService(repo) }
}

describe('PresetService', () => {
  it('create 生成 id 与时间戳并持久化', async () => {
    const { service, repo } = createService()
    const created = await service.create(makePresetInput())

    expect(created.id).toBeTruthy()
    expect(created.createdAt).toBeTypeOf('string')
    expect((await repo.list()).map((preset) => preset.id)).toEqual([created.id])
  })

  it('同一工具下重名抛出 E_PRESET_DUPLICATE_NAME', async () => {
    const { service } = createService()
    await service.create(makePresetInput())

    await expect(service.create(makePresetInput())).rejects.toMatchObject({
      code: 'E_PRESET_DUPLICATE_NAME',
    })
  })

  it('不同工具允许同名', async () => {
    const { service } = createService()
    await service.create(makePresetInput())
    await expect(
      service.create(makePresetInput({ tool: 'codex', name: 'GLM-4.6' }))
    ).resolves.toBeTruthy()
  })

  it('update 保留 id 与 createdAt', async () => {
    const { service } = createService()
    const created = await service.create(makePresetInput())

    const updated = await service.update(created.id, makePresetInput({ name: '新名字' }))

    expect(updated.id).toBe(created.id)
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.name).toBe('新名字')
  })

  it('remove 不存在的预设抛出 E_PRESET_NOT_FOUND', async () => {
    const { service } = createService()
    await expect(service.remove('missing')).rejects.toMatchObject({
      code: 'E_PRESET_NOT_FOUND',
    })
  })
})
