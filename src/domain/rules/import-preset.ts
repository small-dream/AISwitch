import { CLAUDE_ENV_KEYS, CODEX_AUTH_KEYS, CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import type { PresetInput } from '@/domain/entities/preset'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import { isRecord } from '@/utils/guards'

function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl
  }
}

function hasManagedClaudeKey(env: Record<string, string>): boolean {
  return (
    CLAUDE_ENV_KEYS.authToken in env ||
    CLAUDE_ENV_KEYS.model in env ||
    CLAUDE_ENV_KEYS.baseUrl in env ||
    CLAUDE_ENV_KEYS.smallFastModel in env
  )
}

/** 从 Claude 当前配置生成待编辑的预设草稿；无任何可识别键时返回 null */
export function claudePresetInputFrom(settings: ClaudeSettings): PresetInput | null {
  const env = settings.env
  if (!env || !hasManagedClaudeKey(env)) {
    return null
  }
  const baseUrl = env[CLAUDE_ENV_KEYS.baseUrl]
  const model = env[CLAUDE_ENV_KEYS.model] ?? ''
  return {
    tool: 'claude-code',
    name: model || (baseUrl ? hostOf(baseUrl) : '官方配置'),
    providerName: baseUrl ? hostOf(baseUrl) : '官方 API',
    baseUrl,
    apiKey: env[CLAUDE_ENV_KEYS.authToken] ?? '',
    model,
    smallFastModel: env[CLAUDE_ENV_KEYS.smallFastModel],
  }
}

function codexApiKeyFrom(auth: unknown): string {
  const raw = isRecord(auth) ? auth[CODEX_AUTH_KEYS.apiKey] : undefined
  return typeof raw === 'string' ? raw : ''
}

function codexBaseUrlFrom(config: CodexConfig): string | undefined {
  const provider = config.model_provider
  if (!provider || provider === CODEX_CONFIG_KEYS.officialProvider) {
    return undefined
  }
  return config.model_providers?.[provider]?.base_url
}

/** 从 Codex 当前配置生成待编辑的预设草稿；无任何可识别信息时返回 null */
export function codexPresetInputFrom(config: CodexConfig, auth: unknown): PresetInput | null {
  const apiKey = codexApiKeyFrom(auth)
  const baseUrl = codexBaseUrlFrom(config)
  const model = config.model ?? ''
  if (!model && !apiKey && !baseUrl) {
    return null
  }
  return {
    tool: 'codex',
    name: model || (baseUrl ? hostOf(baseUrl) : '导入配置'),
    providerName: baseUrl ? hostOf(baseUrl) : 'OpenAI 官方',
    baseUrl,
    apiKey,
    model,
  }
}
