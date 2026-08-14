/** Claude Code settings.json → env 字段键名（PRD §5.1 表 A） */
export const CLAUDE_ENV_KEYS = {
  baseUrl: 'ANTHROPIC_BASE_URL',
  authToken: 'ANTHROPIC_AUTH_TOKEN',
  model: 'ANTHROPIC_MODEL',
  smallFastModel: 'ANTHROPIC_SMALL_FAST_MODEL',
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
