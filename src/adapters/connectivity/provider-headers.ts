import type { Preset } from '@/domain/entities/preset'

/** 只有工具与 Key 参与鉴权头，表单草稿（未落库）同样适用 */
export type HeaderTarget = Pick<Preset, 'tool' | 'apiKey'>

/**
 * 供应商请求头（探测与模型目录拉取共用）：
 * 第三方与官方统一 Bearer；Claude 侧额外携带 anthropic-version（官方必需），
 * 同时带 x-api-key 最大化中转站兼容；本地模型（空 Key）不携带任何鉴权头（PRD §5.10）。
 */
export function buildProviderHeaders(target: HeaderTarget): Record<string, string> {
  const headers: Record<string, string> = {}
  if (target.apiKey) {
    headers.Authorization = `Bearer ${target.apiKey}`
  }
  if (target.tool === 'claude-code') {
    headers['anthropic-version'] = '2023-06-01'
    if (target.apiKey) {
      headers['x-api-key'] = target.apiKey
    }
  }
  return headers
}
