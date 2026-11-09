import type { TargetTool } from '@/domain/entities/preset'

/**
 * 供应商模板库：仅预填品牌名 / Base URL / 模型名，永不内嵌 API Key（US-19）。
 *
 * **按工具声明变体（协议感知）**：Claude Code 只会向 `<base>/v1/messages` 发请求、
 * Codex 只会向 `<base>/responses` 发请求，因此同一个供应商在两个工具下的 Base URL
 * 必须不同：
 * - Claude Code 侧只能是 **Anthropic 协议基址**（如 `/api/anthropic`、`/anthropic`、
 *   `/api/v2/apps/claude-code-proxy`），**不得以 `/v1`、`/v3` 这类版本段结尾**，
 *   否则 CLI 会拼成 `/v1/v1/messages`；
 * - Codex 侧只能是 **OpenAI 协议基址**（通常以 `/v1`、`/v3`、`/v4` 结尾），
 *   且绝不能是 `/api/anthropic` 这类 Anthropic 端点。
 * 未声明某工具的模板不会出现在该工具的表单里——从机制上杜绝「把 A 工具的地址填进 B 工具」。
 *
 * **Codex 仅支持 responses 协议**：chat/completions 已被 Codex 官方移除
 * （openai/codex discussions/7782），第三方供应商是否支持 `/responses` 取决于其网关，
 * 这里只保证协议与地址形态正确；模型可用性以供应商最新文档为准。
 *
 * **不收录官方端点**：官方 API / 官方订阅走内建「官方订阅」条目（清空托管键，
 * 鉴权与模型都交回 CLI），模板只需覆盖第三方与本地供应商，预填模型名亦多余。
 *
 * 模型名于 2026-09 依据 OpenCode 官方 models 接口与各厂商公开文档刷新。
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

export const PROVIDER_TEMPLATES: readonly ProviderTemplate[] = [
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
    variants: {
      /** 智谱的 Claude Code 专用端点；OpenAI 兼容端点走 /api/paas/v4 */
      'claude-code': {
        baseUrl: 'https://open.bigmodel.cn/api/anthropic',
        suggestModels: ['glm-5.3', 'glm-5.2', 'glm-4.7', 'glm-4.6'],
      },
      codex: {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        suggestModels: ['glm-5.3', 'glm-5.2', 'glm-4.7', 'glm-4.6'],
      },
    },
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    variants: {
      /** DeepSeek 官方为 Claude Code 提供 /anthropic 端点，不能复用 /v1（会拼成 /v1/v1/messages） */
      'claude-code': {
        baseUrl: 'https://api.deepseek.com/anthropic',
        suggestModels: [
          'deepseek-v4-pro',
          'deepseek-v4-flash',
          'deepseek-chat',
          'deepseek-reasoner',
        ],
      },
      codex: {
        baseUrl: 'https://api.deepseek.com/v1',
        suggestModels: [
          'deepseek-v4-pro',
          'deepseek-v4-flash',
          'deepseek-chat',
          'deepseek-reasoner',
        ],
      },
    },
  },
  {
    id: 'kimi',
    label: 'Kimi（月之暗面）',
    variants: {
      'claude-code': {
        baseUrl: 'https://api.moonshot.cn/anthropic',
        suggestModels: ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2-thinking', 'kimi-k2'],
      },
      codex: {
        baseUrl: 'https://api.moonshot.cn/v1',
        suggestModels: ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2-thinking', 'kimi-k2'],
      },
    },
  },
  {
    id: 'qwen',
    label: '通义千问',
    variants: {
      'claude-code': {
        baseUrl: 'https://dashscope.aliyuncs.com/api/v2/apps/claude-code-proxy',
        suggestModels: ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.7-flash', 'qwen3-coder-next'],
      },
      codex: {
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        suggestModels: ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.7-flash', 'qwen3-coder-next'],
      },
    },
  },
  {
    /** 火山方舟只有 OpenAI 兼容端点，故只出现在 Codex 侧 */
    id: 'doubao',
    label: '豆包（火山方舟）',
    variants: {
      codex: {
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        /** 火山方舟以「接入点 ID」调用模型，模板仅给示例，请以控制台实际 ID 为准 */
        suggestModels: ['doubao-1-5-pro-32k-250115', 'doubao-1-5-lite-32k-250115'],
      },
    },
  },
  {
    /** Ollama 没有 Anthropic 兼容端点，只出现在 Codex 侧 */
    id: 'ollama',
    label: 'Ollama（本地）',
    local: true,
    variants: {
      codex: {
        baseUrl: 'http://127.0.0.1:11434/v1',
        suggestModels: ['qwen3:14b', 'deepseek-r1:14b', 'llama3.3:70b'],
      },
    },
  },
  {
    /** LM Studio 同样只有 OpenAI 兼容端点，只出现在 Codex 侧 */
    id: 'lm-studio',
    label: 'LM Studio（本地）',
    local: true,
    variants: {
      codex: {
        baseUrl: 'http://127.0.0.1:1234/v1',
        suggestModels: ['llama-4-maverick-instruct', 'qwen3-32b-instruct', 'deepseek-r1-70b'],
      },
    },
  },
]

export function findProviderTemplate(templateId: string): ProviderTemplate | undefined {
  return PROVIDER_TEMPLATES.find((template) => template.id === templateId)
}

/** 当前工具可用的模板（工具感知：不展示只在另一工具下有效的地址） */
export function templatesForTool(tool: TargetTool): ProviderTemplate[] {
  return PROVIDER_TEMPLATES.filter((template) => template.variants[tool] !== undefined)
}
