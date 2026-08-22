import { describe, expect, it } from 'vitest'

import type { AppUpdate } from '@/domain/entities/app-update'
import { UpdateService } from '@/services/update-service'
import type { UpdatePort } from '@/types/update-port'

const update: AppUpdate = { currentVersion: '0.1.7', version: '0.1.8' }

function makePort(updateResult: AppUpdate | null, calls: string[]): UpdatePort {
  return {
    check: () => {
      calls.push('check')
      return Promise.resolve(updateResult)
    },
    download: () => {
      calls.push('download')
      return Promise.resolve()
    },
    install: () => {
      calls.push('install')
      return Promise.resolve()
    },
  }
}

describe('UpdateService.prepare', () => {
  it('发现更新后先完成预下载再返回版本信息', async () => {
    const calls: string[] = []
    const port = makePort(update, calls)
    const service = new UpdateService(port)

    const result = await service.prepare()

    expect(result).toEqual(update)
    expect(calls).toEqual(['check', 'download'])
  })

  it('没有新版本时不触发下载', async () => {
    const calls: string[] = []
    const port = makePort(null, calls)
    const service = new UpdateService(port)

    await expect(service.prepare()).resolves.toBeNull()

    expect(calls).toEqual(['check'])
  })
})

describe('UpdateService.install', () => {
  it('将安装动作交给更新端口', async () => {
    const calls: string[] = []
    const port = makePort(update, calls)
    const service = new UpdateService(port)

    await service.install()

    expect(calls).toEqual(['install'])
  })
})
