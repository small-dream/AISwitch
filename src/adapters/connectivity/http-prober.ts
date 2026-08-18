import type { ConnectivityResult } from '@/domain/entities/connectivity'
import type { Preset } from '@/domain/entities/preset'
import { isAllowedBaseUrl } from '@/domain/rules/base-url'
import { buildProbeUrl } from '@/domain/rules/probe-url'
import type { HttpPort } from '@/types/http-port'

const TIMEOUT_MS = 10_000

/** 连通性探测器：GET models 端点，按状态码归档结果（PRD US-06） */
export class ConnectivityProber {
  constructor(private readonly http: HttpPort) {}

  async probe(preset: Preset): Promise<ConnectivityResult> {
    // 隐私红线：探测请求携带 API Key，不合规的 baseUrl 一律拒绝发出
    if (!isAllowedBaseUrl(preset.baseUrl)) {
      return {
        status: 'unreachable',
        message: '已阻止探测：明文 http 地址仅允许本机回环，请改用 https',
      }
    }
    const url = buildProbeUrl(preset)
    const startedAt = Date.now()
    try {
      const response = await this.http.fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(preset),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      return this.fromStatus(response.status, Date.now() - startedAt, url)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      return {
        status: 'unreachable',
        message: `无法连通：${detail}（探测 URL: ${url}）`,
      }
    }
  }

  private buildHeaders(preset: Preset): Record<string, string> {
    const headers: Record<string, string> = { Authorization: `Bearer ${preset.apiKey}` }
    if (preset.tool === 'claude-code') {
      // 官方 API 需要 version 头；中转站两者兼容，同时携带 x-api-key 最大化兼容
      headers['anthropic-version'] = '2023-06-01'
      headers['x-api-key'] = preset.apiKey
    }
    return headers
  }

  private fromStatus(status: number, latencyMs: number, url: string): ConnectivityResult {
    if (status >= 200 && status < 300) {
      return { status: 'ok', latencyMs, message: `连通正常（${String(latencyMs)}ms）` }
    }
    if (status === 401 || status === 403) {
      return { status: 'invalid-key', message: 'API Key 无效或无权限' }
    }
    if (status === 404 || status === 405) {
      return { status: 'unsupported', message: '该供应商不支持探测接口，请直接切换验证' }
    }
    return { status: 'unreachable', message: `服务异常（HTTP ${String(status)}，探测 URL: ${url}）` }
  }
}
