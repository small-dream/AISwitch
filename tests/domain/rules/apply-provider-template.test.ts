import { describe, expect, it } from 'vitest'

import {
  findProviderTemplate,
  PROVIDER_TEMPLATES,
  templatesForTool,
} from '@/constants/provider-templates'
import type { TargetTool } from '@/domain/entities/preset'
import { applyProviderTemplate } from '@/domain/rules/apply-provider-template'

const TOOLS: readonly TargetTool[] = ['claude-code', 'codex']

describe('applyProviderTemplate', () => {
  it('官方模板：无 Base URL（官方 API），模型取该工具第一个建议模型', () => {
    const template = findProviderTemplate('claude-official')
    const fill = template ? applyProviderTemplate(template, 'claude-code') : null

    expect(fill?.baseUrl).toBeUndefined()
    expect(fill?.providerName).toBe('Claude 官方')
    expect(fill?.model).toBe(template?.variants['claude-code']?.suggestModels[0])
  })

  it('模板未声明该工具时返回 null（绝不填出另一工具的地址）', () => {
    const claudeOfficial = findProviderTemplate('claude-official')
    const gptOfficial = findProviderTemplate('gpt-official')

    expect(claudeOfficial && applyProviderTemplate(claudeOfficial, 'codex')).toBeNull()
    expect(gptOfficial && applyProviderTemplate(gptOfficial, 'claude-code')).toBeNull()
  })

  it('本地模板（Ollama）：两个工具通用、带 Base URL 且不内嵌 Key', () => {
    const template = findProviderTemplate('ollama')

    expect(template?.local).toBe(true)
    for (const tool of TOOLS) {
      const fill = template ? applyProviderTemplate(template, tool) : null
      expect(fill?.baseUrl).toContain('127.0.0.1')
      expect(fill?.model.length).toBeGreaterThan(0)
    }
  })

  it('未知模板 id 返回 undefined', () => {
    expect(findProviderTemplate('not-exist')).toBeUndefined()
  })
})

describe('applyProviderTemplate · OpenCode 套餐（工具感知）', () => {
  it('Zen：Claude Code 用 /zen + Claude 模型，Codex 用 /zen/v1 + GPT 模型', () => {
    const template = findProviderTemplate('opencode-zen')
    const claude = template ? applyProviderTemplate(template, 'claude-code') : null
    const codex = template ? applyProviderTemplate(template, 'codex') : null

    expect(claude?.baseUrl).toBe('https://opencode.ai/zen')
    expect(claude?.model).toMatch(/^claude-/)
    expect(claude?.smallFastModel).toBe('claude-haiku-4-5')
    expect(codex?.baseUrl).toBe('https://opencode.ai/zen/v1')
    expect(codex?.model).toMatch(/^gpt-5/)
  })

  it('Go：Claude Code 用 /zen/go + Qwen/MiniMax，Codex 用 /zen/go/v1 + DeepSeek/Grok', () => {
    const template = findProviderTemplate('opencode-go')
    const claude = template ? applyProviderTemplate(template, 'claude-code') : null
    const codex = template ? applyProviderTemplate(template, 'codex') : null

    expect(claude?.baseUrl).toBe('https://opencode.ai/zen/go')
    expect(claude?.model).toBe('minimax-m3')
    expect(claude?.smallFastModel).toBe('qwen3.8-flash')
    expect(codex?.baseUrl).toBe('https://opencode.ai/zen/go/v1')
    // 实测 Go 网关在 /responses 上支持 DeepSeek 与 Grok，故 Codex 侧预填 DeepSeek
    expect(codex?.model).toBe('deepseek-v4.1-flash')
  })

  it('Claude 侧与 Codex 侧地址不同，且 Codex 侧为 Claude 侧 + /v1', () => {
    for (const id of ['opencode-zen', 'opencode-go']) {
      const template = findProviderTemplate(id)
      const claude = template?.variants['claude-code']?.baseUrl
      const codex = template?.variants.codex?.baseUrl
      if (!claude || !codex) {
        throw new Error(`模板 ${id} 缺少某一侧的 Base URL`)
      }
      expect(claude).not.toBe(codex)
      expect(codex).toBe(`${claude}/v1`)
    }
  })
})

describe('applyProviderTemplate · OpenCode 套餐 Codex 侧模型约束（按网关实测）', () => {
  it('不预填网关判定 ModelProtocolUnsupported 的模型族', () => {
    for (const id of ['opencode-zen', 'opencode-go']) {
      const models = findProviderTemplate(id)?.variants.codex?.suggestModels ?? []
      expect(models.length).toBeGreaterThan(0)
      for (const model of models) {
        // 实测这些族在 /responses 上返回 400 ModelProtocolUnsupported；
        // DeepSeek / Grok 已实测可用，故不在此列。
        expect(model).not.toMatch(/^(glm|kimi|minimax|qwen|mimo|longcat|hy\d)/)
      }
    }
  })

  it('Go × Codex 预填 DeepSeek（实测网关 /responses 支持该模型族）', () => {
    const models = findProviderTemplate('opencode-go')?.variants.codex?.suggestModels ?? []

    expect(models.some((model) => model.startsWith('deepseek-'))).toBe(true)
  })
})

describe('PROVIDER_TEMPLATES 结构约束', () => {
  it('模板 id 唯一、变体建议模型非空', () => {
    const ids = PROVIDER_TEMPLATES.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const template of PROVIDER_TEMPLATES) {
      for (const tool of TOOLS) {
        const variant = template.variants[tool]
        if (variant) {
          expect(variant.suggestModels.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('每个工具都至少有一个可用模板', () => {
    for (const tool of TOOLS) {
      expect(templatesForTool(tool).length).toBeGreaterThan(0)
    }
  })

  it('Base URL 不含 CLI 自行追加的路径段，非本地模板一律 https', () => {
    for (const template of PROVIDER_TEMPLATES) {
      for (const tool of TOOLS) {
        const { baseUrl } = template.variants[tool] ?? {}
        if (!baseUrl) {
          continue
        }
        expect(baseUrl).not.toMatch(/\/(responses|chat\/completions|messages)$/)
        expect(baseUrl).not.toMatch(/\/v1\/messages$/)
        if (!template.local) {
          expect(baseUrl.startsWith('https://')).toBe(true)
        }
      }
    }
  })

  it('模板永不内嵌 API Key', () => {
    expect(JSON.stringify(PROVIDER_TEMPLATES)).not.toMatch(/sk-|Bearer /)
  })
})
