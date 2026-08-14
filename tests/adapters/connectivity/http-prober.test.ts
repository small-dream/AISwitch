import { describe, expect, it } from 'vitest'

import { ConnectivityProber } from '@/adapters/connectivity/http-prober'
import { makePreset } from '../../helpers/make-preset'
import type { HttpPort } from '@/types/http-port'

function fakeHttp(status: number): HttpPort {
  return {
    fetch: () => Promise.resolve(new Response('{}', { status })),
  }
}

function failingHttp(message: string): HttpPort {
  return {
    fetch: () => Promise.reject(new Error(message)),
  }
}

describe('ConnectivityProber', () => {
  it('2xx → ok 且携带耗时', async () => {
    const prober = new ConnectivityProber(fakeHttp(200))
    const result = await prober.probe(makePreset())
    expect(result.status).toBe('ok')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('401/403 → invalid-key', async () => {
    const prober = new ConnectivityProber(fakeHttp(401))
    expect((await prober.probe(makePreset())).status).toBe('invalid-key')
  })

  it('404 → unsupported（供应商不支持探测接口）', async () => {
    const prober = new ConnectivityProber(fakeHttp(404))
    expect((await prober.probe(makePreset())).status).toBe('unsupported')
  })

  it('其他状态码 → unreachable', async () => {
    const prober = new ConnectivityProber(fakeHttp(502))
    expect((await prober.probe(makePreset())).status).toBe('unreachable')
  })

  it('网络异常 → unreachable 且包含原因', async () => {
    const prober = new ConnectivityProber(failingHttp('timeout'))
    const result = await prober.probe(makePreset())
    expect(result.status).toBe('unreachable')
    expect(result.message).toContain('timeout')
  })
})
