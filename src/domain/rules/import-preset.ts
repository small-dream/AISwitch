import {
  CLAUDE_ENV_KEYS,
  CLAUDE_SLOT_KEYS,
  CODEX_AUTH_KEYS,
  CODEX_CONFIG_KEYS,
} from '@/constants/config-keys'
import type { PresetInput } from '@/domain/entities/preset'
import { findCatalogEntry } from '@/domain/rules/codex-catalog'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import type { CodexConfig, CodexProviderBlock } from '@/domain/schemas/codex-config'
import { isRecord } from '@/utils/guards'

function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl
  }
}

/** 当前生效模型读取链：ANTHROPIC_MODEL → 槽位键 → 顶层 model（与 detect 保持一致） */
function claudeActiveModel(settings: ClaudeSettings): string {
  const env = settings.env ?? {}
  return (
    env[CLAUDE_ENV_KEYS.model] ??
    env[CLAUDE_SLOT_KEYS.sonnet] ??
    env[CLAUDE_SLOT_KEYS.opus] ??
    env[CLAUDE_SLOT_KEYS.haiku] ??
    settings.model ??
    ''
  )
}

function hasManagedClaudeKey(settings: ClaudeSettings): boolean {
  const env = settings.env ?? {}
  const managedKeys = [
    CLAUDE_ENV_KEYS.authToken,
    CLAUDE_ENV_KEYS.model,
    CLAUDE_ENV_KEYS.baseUrl,
    CLAUDE_ENV_KEYS.smallFastModel,
    CLAUDE_SLOT_KEYS.haiku,
    CLAUDE_SLOT_KEYS.sonnet,
    CLAUDE_SLOT_KEYS.opus,
  ] as const
  if (managedKeys.some((key) => key in env)) {
    return true
  }
  return Boolean(settings.model)
}

/** 从 Claude 当前配置生成待编辑的预设草稿；无任何可识别键时返回 null */
export function claudePresetInputFrom(settings: ClaudeSettings): PresetInput | null {
  if (!hasManagedClaudeKey(settings)) {
    return null
  }
  const env = settings.env ?? {}
  const baseUrl = env[CLAUDE_ENV_KEYS.baseUrl]
  const model = claudeActiveModel(settings)
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

interface CodexProviderSource {
  baseUrl: string | undefined
  providerName: string | undefined
  /** provider 块内嵌 Key（DeepSeek 官方脚本等用法） */
  blockToken: string | undefined
}

/** 供应商展示名：块内 name → base_url host → 块 id */
function providerNameOf(block: CodexProviderBlock, fallbackId: string): string {
  if (block.name) {
    return block.name
  }
  if (block.base_url) {
    return hostOf(block.base_url)
  }
  return fallbackId
}

/** 解析当前供应商：model_provider 指向的 config.toml provider 块（官方机制，DeepSeek/yunwu 等皆如此） */
function codexProviderFrom(config: CodexConfig): CodexProviderSource {
  const provider = config.model_provider
  const blocks = config.model_providers
  if (!provider || provider === CODEX_CONFIG_KEYS.officialProvider) {
    return { baseUrl: undefined, providerName: undefined, blockToken: undefined }
  }
  const directed = blocks?.[provider]
  if (!directed) {
    return { baseUrl: undefined, providerName: provider, blockToken: undefined }
  }
  return {
    baseUrl: directed.base_url,
    providerName: providerNameOf(directed, provider),
    blockToken: directed.experimental_bearer_token,
  }
}

/** 从 Codex 当前配置生成待编辑的预设草稿；无任何可识别信息时返回 null */
export function codexPresetInputFrom(
  config: CodexConfig,
  auth: unknown,
  modelsCatalog: unknown = null
): PresetInput | null {
  const source = codexProviderFrom(config)
  // Key 读取链：provider 块内嵌 token（DeepSeek 脚本用法）→ auth.json（官方 API 用法）
  const apiKey = source.blockToken ?? codexApiKeyFrom(auth)
  const { baseUrl, providerName } = source
  const model = config.model ?? ''
  if (!model && !apiKey && !baseUrl) {
    return null
  }
  return {
    tool: 'codex',
    name: importDisplayName(model, baseUrl),
    providerName: importProviderName(providerName, baseUrl),
    baseUrl,
    apiKey,
    model,
    modelMetadata: captureModelMetadata(config, model, modelsCatalog),
  }
}

function importDisplayName(model: string, baseUrl: string | undefined): string {
  return model || (baseUrl ? hostOf(baseUrl) : '导入配置')
}

function importProviderName(
  providerName: string | undefined,
  baseUrl: string | undefined
): string {
  return providerName ?? (baseUrl ? hostOf(baseUrl) : 'OpenAI 官方')
}

/** 目录启用（model_catalog_json 已设）且含当前模型条目时，整份捕获（含同族模型）供切换回写 */
function captureModelMetadata(
  config: CodexConfig,
  model: string,
  modelsCatalog: unknown
): Record<string, unknown> | undefined {
  if (
    !config.model_catalog_json ||
    !model ||
    !isRecord(modelsCatalog) ||
    !Array.isArray(modelsCatalog.models)
  ) {
    return undefined
  }
  return findCatalogEntry(modelsCatalog, model) ? { ...modelsCatalog } : undefined
}
