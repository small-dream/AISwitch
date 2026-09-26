import type { ModelCatalogQuery, ModelCatalogResult } from '@/domain/entities/model-catalog'
import { isAllowedBaseUrl } from '@/domain/rules/base-url'
import { parseModelIds } from '@/domain/rules/model-catalog'
import { buildProbeUrl } from '@/domain/rules/probe-url'
import type { HttpPort } from '@/types/http-port'
import { buildProviderHeaders } from './provider-headers'

const TIMEOUT_MS = 10_000

/**
 * 供应商模型目录拉取（US-19 模型名下拉）：与连通性探测共用 baseUrl 守卫、
 * models 端点与鉴权链；任何失败只返回文案，由 UI 降级为手填，绝不阻断表单。
 */
export class ModelCatalogFetcher {
  constructor(private readonly http: HttpPort) {}

  async list(query: ModelCatalogQuery): Promise<ModelCatalogResult> {
    if (!isAllowedBaseUrl(query.baseUrl)) {
      return {
        status: 'error',
        message: '已阻止请求：明文 http 地址仅允许本机回环，请改用 https',
      }
    }
    const url = buildProbeUrl(query)
    try {
      const response = await this.http.fetch(url, {
        method: 'GET',
        headers: buildProviderHeaders(query),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) {
        return {
          status: 'error',
          message: `获取模型列表失败（HTTP ${String(response.status)}，${url}）`,
        }
      }
      return { status: 'ok', models: parseModelIds(await response.json()) }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      return { status: 'error', message: `无法获取模型列表：${detail}` }
    }
  }
}
