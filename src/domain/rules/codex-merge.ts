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
    // 双通道写 Key：块内嵌 token（DeepSeek 脚本模式）+ auth.json（官方模式），两种取 key 路径都生效。
    // name 为 Codex 必填（缺失会导致整个 config.toml 加载失败、CLI/插件退回安装引导）；
    // wire_api 统一 responses，与官方及主流中转对齐，避免回落 chat 协议。
    providers[injected] = {
      ...existing,
      name: preset.providerName,
      base_url: preset.baseUrl,
      wire_api: 'responses',
      experimental_bearer_token: preset.apiKey ?? '',
    }
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
  if (!preset.apiKey) {
    const next = { ...base }
    Reflect.deleteProperty(next, CODEX_AUTH_KEYS.apiKey)
    return next
  }
  return { ...base, [CODEX_AUTH_KEYS.apiKey]: preset.apiKey }
}

/**
 * 剥离 config.toml 中的托管键（mergeCodexConfig 的逆操作，一键还原的无基线兜底）：
 * 删 model / model_provider / 注入的 provider 块；model_catalog_json 仅在指向
 * 托管 models.json（managedCatalogPath）时才删——用户自有指向不动。
 * model_providers 剥空后移除键本身，其余顶层字段原样保留。
 */
export function stripManagedCodexConfig(
  config: CodexConfig,
  managedCatalogPath: string
): CodexConfig {
  const next = { ...config }
  Reflect.deleteProperty(next, 'model')
  Reflect.deleteProperty(next, 'model_provider')
  if (next.model_catalog_json === managedCatalogPath) {
    Reflect.deleteProperty(next, 'model_catalog_json')
  }
  const injected = CODEX_CONFIG_KEYS.injectedProvider
  if (next.model_providers) {
    const providers = { ...next.model_providers }
    Reflect.deleteProperty(providers, injected)
    if (Object.keys(providers).length === 0) {
      Reflect.deleteProperty(next, 'model_providers')
    } else {
      next.model_providers = providers
    }
  }
  return next
}

/**
 * 剥离 auth.json 中的托管键：删 OPENAI_API_KEY，其余字段保留。
 * 剥空返回 null（调用方按「应用创建」语义删除该文件）。
 */
export function stripManagedCodexAuth(auth: unknown): CodexAuthFile | null {
  const base: CodexAuthFile = isRecord(auth) ? { ...auth } : {}
  Reflect.deleteProperty(base, CODEX_AUTH_KEYS.apiKey)
  return Object.keys(base).length === 0 ? null : base
}

/** 当前生效供应商的展示名：块内 name → 注入块 base_url → provider id */
export function codexProviderLabel(config: CodexConfig): string {
  const provider = config.model_provider
  if (!provider) {
    return '未设置'
  }
  const block = config.model_providers?.[provider]
  if (provider !== CODEX_CONFIG_KEYS.injectedProvider) {
    return block?.name ?? provider
  }
  const injected = config.model_providers?.[CODEX_CONFIG_KEYS.injectedProvider]
  return injected?.base_url ?? '自定义供应商'
}
