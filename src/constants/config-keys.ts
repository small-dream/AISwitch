/** Claude Code settings.json → env 字段键名（PRD §5.1 表 A） */
export const CLAUDE_ENV_KEYS = {
  baseUrl: 'ANTHROPIC_BASE_URL',
  authToken: 'ANTHROPIC_AUTH_TOKEN',
  model: 'ANTHROPIC_MODEL',
  smallFastModel: 'ANTHROPIC_SMALL_FAST_MODEL',
} as const

/**
 * Claude Code 模型槽位键（第三方中转常见用法：把 sonnet/opus/haiku 槽位映射到具体模型）。
 * 检测到任一槽位键即视为「槽位映射模式」，切换时同步覆盖，否则配置不生效。
 */
export const CLAUDE_SLOT_KEYS = {
  haiku: 'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  sonnet: 'ANTHROPIC_DEFAULT_SONNET_MODEL',
  opus: 'ANTHROPIC_DEFAULT_OPUS_MODEL',
} as const

/** Codex CLI config.toml 键名（PRD §5.1 表 B） */
export const CODEX_CONFIG_KEYS = {
  model: 'model',
  modelProvider: 'model_provider',
  modelProviders: 'model_providers',
  injectedProvider: 'jake_current',
  officialProvider: 'openai',
} as const

/** Codex CLI auth.json 键名 */
export const CODEX_AUTH_KEYS = {
  apiKey: 'OPENAI_API_KEY',
} as const

/**
 * AISwitch 托管的 Claude env 键全集：
 * 切换写入（envMatches 校验）与一键还原剥离共用同一清单，避免两处漂移。
 */
export const CLAUDE_MANAGED_ENV_KEYS = [
  CLAUDE_ENV_KEYS.authToken,
  CLAUDE_ENV_KEYS.model,
  CLAUDE_ENV_KEYS.baseUrl,
  CLAUDE_ENV_KEYS.smallFastModel,
  CLAUDE_SLOT_KEYS.haiku,
  CLAUDE_SLOT_KEYS.sonnet,
  CLAUDE_SLOT_KEYS.opus,
] as const
