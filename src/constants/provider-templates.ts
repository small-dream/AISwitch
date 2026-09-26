import type { TargetTool } from '@/domain/entities/preset'

/**
 * 供应商模板库：仅预填品牌名 / Base URL / 模型名，永不内嵌 API Key（US-19）。
 *
 * **工具感知**：同一供应商在 Claude Code 与 Codex 下的 Base URL 与可用模型可能不同，
 * 因此预填值按工具声明（例：OpenCode Zen 的 Claude Code 地址以 `/zen` 结尾——
 * CLI 自动补 `/v1/messages`；Codex 地址以 `/zen/v1` 结尾——CLI 自动补 `/responses`）。
 * 未声明某工具的模板不会出现在该工具的表单中。
 *
 * **Codex 仅支持 responses 协议**：chat/completions 已被 Codex 官方移除
 * （openai/codex discussions/7782），因此 Codex 侧模型必须是供应商 `/responses`
 * 路由上的模型；只提供 `/chat/completions` 的模型无法用于 Codex。
 *
 * 模型名于 2026-09 依据 OpenCode 官方 models 接口与各厂商公开文档刷新，
 * 具体可用模型以供应商最新文档为准。
 */
export interface ProviderTemplateVariant {
  baseUrl?: string
  /** 建议模型：首个作为默认预填 */
  suggestModels: readonly string[]
  /** 仅 claude-code：轻量任务模型（ANTHROPIC_SMALL_FAST_MODEL） */
  smallFastModel?: string
}

export interface ProviderTemplate {
  id: string
  label: string
  /** 本地模型（Ollama / LM Studio）：无需 API Key */
  local?: boolean
  /** 各工具下的预填值；未声明的工具 = 该模板不适用 */
  variants: Partial<Record<TargetTool, ProviderTemplateVariant>>
}

/** 两个工具共用同一套预填值的模板 */
function bothTools(
  variant: ProviderTemplateVariant
): Partial<Record<TargetTool, ProviderTemplateVariant>> {
  return { 'claude-code': variant, codex: variant }
}

export const PROVIDER_TEMPLATES: readonly ProviderTemplate[] = [
  {
    id: 'claude-official',
    label: 'Claude 官方',
    variants: {
      'claude-code': {
        suggestModels: [
          'claude-sonnet-5',
          'claude-opus-5',
          'claude-haiku-4.5',
          'claude-sonnet-4.6',
        ],
      },
    },
  },
  {
    id: 'gpt-official',
    label: 'OpenAI GPT',
    variants: {
      codex: {
        suggestModels: ['gpt-5.6', 'gpt-5.4', 'gpt-5.1', 'gpt-5.3-codex', 'gpt-5-codex'],
      },
    },
  },
  {
    /** OpenCode Zen：按量计费的模型网关（opencode.ai/auth 取 Key） */
    id: 'opencode-zen',
    label: 'OpenCode Zen（套餐）',
    variants: {
      'claude-code': {
        baseUrl: 'https://opencode.ai/zen',
        suggestModels: [
          'claude-sonnet-5',
          'claude-opus-5-5',
          'claude-opus-4-8',
          'claude-haiku-4-5',
        ],
        smallFastModel: 'claude-haiku-4-5',
      },
      codex: {
        /**
         * 实测（2026-09-26，POST /zen/v1/responses）：目录内模型均以 402 计费失败
         * 应答，说明协议被接受；gpt-5.2-codex / gpt-5.6-sol 返回
         * 403 Model access is disabled，故不预填。
         */
        baseUrl: 'https://opencode.ai/zen/v1',
        suggestModels: ['gpt-5.3-codex', 'gpt-5.3-codex-spark', 'gpt-5.5', 'gpt-6-sol'],
      },
    },
  },
  {
    /** OpenCode Go：$10/月订阅，主打开源编码模型（与 Zen 同一把 Key） */
    id: 'opencode-go',
    label: 'OpenCode Go（订阅）',
    variants: {
      'claude-code': {
        baseUrl: 'https://opencode.ai/zen/go',
        suggestModels: ['minimax-m3', 'qwen3.8-max', 'qwen3.7-max', 'qwen3.8-flash'],
        smallFastModel: 'qwen3.8-flash',
      },
      codex: {
        /**
         * Codex 只支持 responses 协议，故只预填 Go 网关在 `/responses` 上支持的模型。
         * 实测（2026-09-26，`POST /zen/go/v1/responses`）：
         * - 通过：DeepSeek 全系、Grok 4.7 / 4.6；
         * - 400 ModelProtocolUnsupported：GLM / Kimi / MiniMax / Qwen / MiMo / LongCat / Hy，
         *   这些模型只有在 Claude Code 侧（`/messages`）才可用；
         * - GPT Luna 系列返回 403 unsupported_country_region_territory（部分地区不可用），故不预填。
         */
        baseUrl: 'https://opencode.ai/zen/go/v1',
        suggestModels: [
          'deepseek-v4.1-flash',
          'deepseek-v4-pro',
          'deepseek-v4-flash',
          'grok-4.7',
          'grok-4.6',
        ],
      },
    },
  },
  {
    id: 'glm',
    label: '智谱 GLM',
    variants: bothTools({
      baseUrl: 'https://open.bigmodel.cn/api/anthropic',
      suggestModels: ['glm-5.3', 'glm-5.2', 'glm-4.7', 'glm-4.6'],
    }),
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    variants: bothTools({
      baseUrl: 'https://api.deepseek.com/v1',
      suggestModels: ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
    }),
  },
  {
    id: 'kimi',
    label: 'Kimi（月之暗面）',
    variants: bothTools({
      baseUrl: 'https://api.moonshot.cn/v1',
      suggestModels: ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2-thinking', 'kimi-k2'],
    }),
  },
  {
    id: 'qwen',
    label: '通义千问',
    variants: bothTools({
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      suggestModels: ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.7-flash', 'qwen3-coder-next'],
    }),
  },
  {
    id: 'doubao',
    label: '豆包（火山方舟）',
    variants: bothTools({
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      /** 火山方舟以「接入点 ID」调用模型，模板仅给示例，请以控制台实际 ID 为准 */
      suggestModels: ['doubao-1-5-pro-32k-250115', 'doubao-1-5-lite-32k-250115'],
    }),
  },
  {
    id: 'ollama',
    label: 'Ollama（本地）',
    local: true,
    variants: bothTools({
      baseUrl: 'http://127.0.0.1:11434',
      suggestModels: ['qwen3:14b', 'deepseek-r1:14b', 'llama3.3:70b'],
    }),
  },
  {
    id: 'lm-studio',
    label: 'LM Studio（本地）',
    local: true,
    variants: bothTools({
      baseUrl: 'http://127.0.0.1:1234/v1',
      suggestModels: ['llama-4-maverick-instruct', 'qwen3-32b-instruct', 'deepseek-r1-70b'],
    }),
  },
]

export function findProviderTemplate(templateId: string): ProviderTemplate | undefined {
  return PROVIDER_TEMPLATES.find((template) => template.id === templateId)
}

/** 当前工具可用的模板（工具感知：不展示只在另一工具下有效的地址） */
export function templatesForTool(tool: TargetTool): ProviderTemplate[] {
  return PROVIDER_TEMPLATES.filter((template) => template.variants[tool] !== undefined)
}
