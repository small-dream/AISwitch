import type { Preset } from '@/domain/entities/preset'

/** 无 baseUrl 时的官方 API 基址 */
const OFFICIAL_BASES = {
  'claude-code': 'https://api.anthropic.com',
  codex: 'https://api.openai.com/v1',
} as const

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

/** OpenAI 风格 models 端点：约定 base 已含 /v1，未含则补齐 */
function openAiModelsUrl(base: string): string {
  const trimmed = trimTrailingSlash(base)
  return trimmed.endsWith('/v1') ? `${trimmed}/models` : `${trimmed}/v1/models`
}

/**
 * 连通性探测 URL（纯函数）：
 * Claude（Anthropic 风格）：GET {base}/v1/models
 * Codex（OpenAI 风格）：GET {base}/models 或 {base}/v1/models
 */
export function buildProbeUrl(preset: Preset): string {
  const base = trimTrailingSlash(preset.baseUrl ?? OFFICIAL_BASES[preset.tool])
  if (preset.tool === 'claude-code') {
    return `${base}/v1/models`
  }
  return openAiModelsUrl(base)
}
