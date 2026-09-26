import { describe, expect, it } from 'vitest'

import { ModelCatalogFetcher } from '@/adapters/connectivity/model-catalog-fetcher'
import type { HttpPort } from '@/types/http-port'

const QUERY = { tool: 'codex', baseUrl: 'https://relay.example.com/v1', apiKey: 'sk-test' } as const

function jsonHttp(
  body: unknown,
  status = 200
): { http: HttpPort; calls: { url: string; init: RequestInit }[] } {
  const calls: { url: string; init: RequestInit }[] = []
  const http: HttpPort = {
    fetch(url, init) {
      calls.push({ url, init })
      return Promise.resolve(new Response(JSON.stringify(body), { status }))
    },
  }
  return { http, calls }
}

describe('ModelCatalogFetcher', () => {
  it('命中 /models 端点并解析模型 id', async () => {
    const { http, calls } = jsonHttp({ data: [{ id: 'gpt-5.6-luna' }] })
    const result = await new ModelCatalogFetcher(http).list(QUERY)

    expect(result).toEqual({ status: 'ok', models: ['gpt-5.6-luna'] })
    expect(calls[0]?.url).toBe('https://relay.example.com/v1/models')
  })

  it('Claude 侧带 anthropic-version，鉴权头与探测一致', async () => {
    const { http, calls } = jsonHttp({ data: [] })
    const query = { ...QUERY, tool: 'claude-code' as const, baseUrl: 'https://relay.example.com' }
    await new ModelCatalogFetcher(http).list(query)

    const headers = calls[0]?.init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer sk-test')
    expect(headers['anthropic-version']).toBe('2023-06-01')
  })

  it('http 非回环地址：拒绝请求且不发出任何请求（隐私红线）', async () => {
    const { http, calls } = jsonHttp({ data: [] })
    const result = await new ModelCatalogFetcher(http).list({
      ...QUERY,
      baseUrl: 'http://evil-relay.com/v1',
    })

    expect(result.status).toBe('error')
    expect(calls).toEqual([])
  })

  it('非 2xx 与网络异常都降级为错误结果，不抛出', async () => {
    const notFound = await new ModelCatalogFetcher(jsonHttp({}, 404).http).list(QUERY)
    expect(notFound.status).toBe('error')

    const broken: HttpPort = { fetch: () => Promise.reject(new Error('boom')) }
    const failed = await new ModelCatalogFetcher(broken).list(QUERY)
    expect(failed.status).toBe('error')
  })
})
