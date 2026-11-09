import type { Preset } from '@/domain/entities/preset'

/** 探测与模型目录拉取只依赖工具与 Base URL，无需完整预设（表单草稿同样适用） */
export type ProbeTarget = Pick<Preset, 'tool' | 'baseUrl'>

/** 无 baseUrl 时的官方 API 基址 */
const OFFICIAL_BASES = {
  'claude-code': 'https://api.anthropic.com',
  codex: 'https://api.openai.com/v1',
} as const

/** 形如 `/v1`、`/v3`、`/v4` 的版本段：OpenAI 风格的基址通常已经带了它 */
const VERSION_SUFFIX = /\/v\d+$/

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function trimVersionSuffix(value: string): string {
  return value.replace(VERSION_SUFFIX, '')
}

/** Claude（Anthropic 风格）：基址只能是协议根，`/v1/models` 由这里补齐 */
function anthropicModelsUrl(base: string): string {
  return `${trimVersionSuffix(base)}/v1/models`
}

/** OpenAI 风格 models 端点：基址已带版本段（/v1、/v3、/v4）就直接接 /models，否则补 /v1 */
function openAiModelsUrl(base: string): string {
  const trimmed = trimTrailingSlash(base)
  return VERSION_SUFFIX.test(trimmed) ? `${trimmed}/models` : `${trimmed}/v1/models`
}

/**
 * 探测 / 模型目录 URL（纯函数）：
 * Claude（Anthropic 风格）：GET {base}/v1/models，base 自带 `/vN` 时先去掉，
 * 否则会拼成 `/v1/v1/models`（CLI 发请求时同样会再拼一次 `/v1/messages`）。
 * Codex（OpenAI 风格）：GET {base}/models 或 {base}/v1/models。
 */
export function buildProbeUrl(target: ProbeTarget): string {
  const base = trimTrailingSlash(target.baseUrl ?? OFFICIAL_BASES[target.tool])
  if (target.tool === 'claude-code') {
    return anthropicModelsUrl(base)
  }
  return openAiModelsUrl(base)
}
