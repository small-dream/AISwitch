import { describe, expect, it } from 'vitest'

import { BundleRepository } from '@/adapters/bundles/bundle-repository'
import { PATHS } from '@/constants/paths'
import type { BundleCollection } from '@/domain/entities/bundle'
import { createMemoryFs } from '../../helpers/memory-fs'

function collectionOf(): BundleCollection {
  return {
    version: 1,
    bundles: [
      {
        id: 'bundle-1',
        name: '全家 GLM',
        claudePresetId: 'p1',
        codexPresetId: 'p2',
        createdAt: '2026-08-22T00:00:00.000Z',
        updatedAt: '2026-08-22T00:00:00.000Z',
      },
    ],
  }
}

describe('BundleRepository', () => {
  it('save：先收紧 .aiswitch 目录再原子写 bundles.json', async () => {
    const fs = createMemoryFs()
    const repo = new BundleRepository(fs)

    await repo.save(collectionOf())

    expect(fs.restricted()[0]).toBe(PATHS.appDir)
    expect(fs.restricted()).toContain(PATHS.bundlesFile)
    expect(fs.files().get(PATHS.bundlesFile)).toContain('全家 GLM')
  })

  it('文件不存在时 load 返回空集合', async () => {
    const repo = new BundleRepository(createMemoryFs())
    expect((await repo.load()).bundles).toEqual([])
  })

  it('损坏 JSON 抛出 E_CONFIG_PARSE', async () => {
    const repo = new BundleRepository(createMemoryFs({ [PATHS.bundlesFile]: '{broken' }))
    await expect(repo.load()).rejects.toMatchObject({ code: 'E_CONFIG_PARSE' })
  })

  it('list 返回全部组合', async () => {
    const fs = createMemoryFs()
    const repo = new BundleRepository(fs)
    await repo.save(collectionOf())
    expect((await repo.list()).map((bundle) => bundle.id)).toEqual(['bundle-1'])
  })
})
