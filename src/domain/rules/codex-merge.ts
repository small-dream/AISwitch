import { CODEX_AUTH_KEYS, CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import type { Preset } from '@/domain/entities/preset'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import { isRecord } from '@/utils/guards'

export type CodexAuthFile = Record<string, unknown>

/** 合并预设到现有 config.toml 结构（PRD §5.1 表 B） */
export function mergeCodexConfig(current: CodexConfig, preset: Preset): CodexConfig {
  const providers = { ...(current.model_providers ?? {}) }
  const injected = CODEX_CONFIG_KEYS.injectedProvider
  let modelProvider: string
  if (preset.baseUrl) {
    const existing = providers[injected] ?? {}
    providers[injected] = { ...existing, base_url: preset.baseUrl }
    modelProvider = injected
  } else {
    Reflect.deleteProperty(providers, injected)
    modelProvider = CODEX_CONFIG_KEYS.officialProvider
  }
  return {
    ...current,
    model: preset.model,
    model_provider: modelProvider,
    model_providers: providers,
  }
}

/** 合并预设到 auth.json：覆盖 OPENAI_API_KEY，其余字段保留 */
export function mergeCodexAuth(current: unknown, preset: Preset): CodexAuthFile {
  const base: CodexAuthFile = isRecord(current) ? current : {}
  return { ...base, [CODEX_AUTH_KEYS.apiKey]: preset.apiKey }
}

/** 当前生效供应商的展示名 */
export function codexProviderLabel(config: CodexConfig): string {
  const provider = config.model_provider
  if (!provider) {
    return '未设置'
  }
  if (provider !== CODEX_CONFIG_KEYS.injectedProvider) {
    return provider
  }
  const injected = config.model_providers?.[CODEX_CONFIG_KEYS.injectedProvider]
  return injected?.base_url ?? '自定义供应商'
}
