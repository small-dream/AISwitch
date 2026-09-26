import type { Preset } from '@/domain/entities/preset'

/** 探测与模型目录拉取只依赖工具与 Base URL，无需完整预设（表单草稿同样适用） */
export type ProbeTarget = Pick<Preset, 'tool' | 'baseUrl'>

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
 * 探测 / 模型目录 URL（纯函数）：
 * Claude（Anthropic 风格）：GET {base}/v1/models
 * Codex（OpenAI 风格）：GET {base}/models 或 {base}/v1/models
 */
export function buildProbeUrl(target: ProbeTarget): string {
  const base = trimTrailingSlash(target.baseUrl ?? OFFICIAL_BASES[target.tool])
  if (target.tool === 'claude-code') {
    return `${base}/v1/models`
  }
  return openAiModelsUrl(base)
}
