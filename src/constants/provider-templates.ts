/**
 * 供应商模板库：仅预填 Base URL 与模型名，永不内嵌 API Key（US-19）。
 * 模型名于 2026-08 依据 OpenRouter models API 与各厂商公开文档刷新；
 * 模板仅作预填，具体可用模型以供应商最新文档为准。
 */
export interface ProviderTemplate {
  id: string
  label: string
  baseUrl?: string
  /** 本地模型（Ollama / LM Studio）：无需 API Key */
  local?: boolean
  suggestModels: readonly string[]
}

export const PROVIDER_TEMPLATES: readonly ProviderTemplate[] = [
  {
    id: 'claude-official',
    label: 'Claude 官方',
    suggestModels: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4.5', 'claude-sonnet-4.6'],
  },
  {
    id: 'gpt-official',
    label: 'OpenAI GPT',
    suggestModels: ['gpt-5.6', 'gpt-5.4', 'gpt-5.1', 'gpt-5.3-codex', 'gpt-5-codex'],
  },
  {
    id: 'glm',
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    suggestModels: ['glm-5.3', 'glm-5.2', 'glm-4.7', 'glm-4.6'],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    suggestModels: ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'kimi',
    label: 'Kimi（月之暗面）',
    baseUrl: 'https://api.moonshot.cn/v1',
    suggestModels: ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2-thinking', 'kimi-k2'],
  },
  {
    id: 'qwen',
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    suggestModels: ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.7-flash', 'qwen3-coder-next'],
  },
  {
    id: 'doubao',
    label: '豆包（火山方舟）',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    /** 火山方舟以「接入点 ID」调用模型，模板仅给示例，请以控制台实际 ID 为准 */
    suggestModels: ['doubao-1-5-pro-32k-250115', 'doubao-1-5-lite-32k-250115'],
  },
  {
    id: 'ollama',
    label: 'Ollama（本地）',
    baseUrl: 'http://127.0.0.1:11434',
    local: true,
    suggestModels: ['qwen3:14b', 'deepseek-r1:14b', 'llama3.3:70b'],
  },
  {
    id: 'lm-studio',
    label: 'LM Studio（本地）',
    baseUrl: 'http://127.0.0.1:1234/v1',
    local: true,
    suggestModels: ['llama-4-maverick-instruct', 'qwen3-32b-instruct', 'deepseek-r1-70b'],
  },
]

export function findProviderTemplate(templateId: string): ProviderTemplate | undefined {
  return PROVIDER_TEMPLATES.find((template) => template.id === templateId)
}
