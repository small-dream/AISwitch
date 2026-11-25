/**
 * 无 modelMetadata 时为第三方模型生成的最小目录条目。
 *
 * Codex 的 models.json 条目结构随版本漂移，缺字段会让**整份目录加载失败**
 * （不是回落内置目录），因此这里固定写入 codex 0.171 实测的必需字段：
 * slug / display_name / visibility / supported_reasoning_levels / shell_type /
 * supported_in_api / priority / support_verbosity / truncation_policy /
 * experimental_supported_tools，以及 base_instructions。
 *
 * 为什么需要：Codex Desktop 的模型选择器只列 `model/list` 返回的模型；
 * 目录里没有当前模型时，桌面端会退回自己的官方模型并把它写回 config.toml，
 * 留下「第三方 provider + 官方模型名」的错配。预设自带 modelMetadata 时
 * 仍以用户提供的完整条目为准，不走这里的兜底。
 */
export const DEFAULT_CATALOG_INSTRUCTIONS =
  'You are Codex, a coding agent. You and the user share one workspace, and your job is to collaborate with them until their goal is handled. Follow the tool instructions provided in each turn.'

/** 兜底条目的推理档位：OpenAI 兼容端点最通用的 low / medium / high */
const REASONING_LEVELS = [
  { effort: 'low', description: 'Fast responses with lighter reasoning' },
  { effort: 'medium', description: 'Balances speed and reasoning depth' },
  { effort: 'high', description: 'Greater reasoning depth for complex problems' },
] as const

/**
 * 以模型名生成一条 Codex 可识别的目录条目（display_name 缺省即模型名）。
 * 没有 supported_reasoning_levels 时 Codex 的 effort 选择器为空、无法设置，
 * 因此兜底声明 low / medium / high 并把 medium 设为默认。
 */
export function buildCatalogEntry(model: string): Record<string, unknown> {
  return {
    slug: model,
    display_name: model,
    visibility: 'list',
    supported_in_api: true,
    priority: 100,
    support_verbosity: true,
    shell_type: 'shell_command',
    supported_reasoning_levels: REASONING_LEVELS.map((level) => ({ ...level })),
    default_reasoning_level: 'medium',
    supports_reasoning_effort_updates: true,
    truncation_policy: { mode: 'tokens', limit: 10000 },
    experimental_supported_tools: [],
    base_instructions: DEFAULT_CATALOG_INSTRUCTIONS,
  }
}
