import { describe, expect, it } from 'vitest'

import { ConnectivityProber } from '@/adapters/connectivity/http-prober'
import type { HttpPort } from '@/types/http-port'
import { makePreset } from '../../helpers/make-preset'

function trackingHttp(): { http: HttpPort; calls: string[] } {
  const calls: string[] = []
  const http: HttpPort = {
    fetch(url) {
      calls.push(url)
      return Promise.resolve(new Response('null', { status: 200 }))
    },
  }
  return { http, calls }
}

describe('ConnectivityProber baseUrl 守卫', () => {
  it('http 非回环 baseUrl：拒绝探测且不发出任何请求', async () => {
    const { http, calls } = trackingHttp()
    const prober = new ConnectivityProber(http)

    const result = await prober.probe(makePreset({ baseUrl: 'http://evil-relay.com' }))

    expect(result.status).toBe('unreachable')
    expect(result.message).toContain('已阻止探测')
    expect(calls).toEqual([])
  })

  it('https 与回环 baseUrl 照常探测', async () => {
    const { http, calls } = trackingHttp()
    const prober = new ConnectivityProber(http)

    const https = await prober.probe(makePreset({ baseUrl: 'https://relay.example.com' }))
    const loopback = await prober.probe(makePreset({ baseUrl: 'http://localhost:3000' }))

    expect(https.status).toBe('ok')
    expect(loopback.status).toBe('ok')
    expect(calls).toHaveLength(2)
  })
})
