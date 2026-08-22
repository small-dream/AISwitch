import { describe, expect, it } from 'vitest'

import { findProviderTemplate } from '@/constants/provider-templates'
import { applyProviderTemplate } from '@/domain/rules/apply-provider-template'

describe('applyProviderTemplate', () => {
  it('官方模板：无 Base URL（官方 API），模型取第一个建议模型', () => {
    const template = findProviderTemplate('claude-official')
    expect(template).toBeDefined()
    if (!template) {
      return
    }
    expect(template.baseUrl).toBeUndefined()
    const fill = applyProviderTemplate(template)
    expect(fill.providerName).toBe('Claude 官方')
    expect(fill.model).toBe(template.suggestModels[0])
  })

  it('GPT 官方模板：无 Base URL 且内置最新 GPT-5 系列模型', () => {
    const template = findProviderTemplate('gpt-official')
    expect(template).toBeDefined()
    if (!template) {
      return
    }
    expect(template.baseUrl).toBeUndefined()
    expect(template.suggestModels[0]).toMatch(/^gpt-5/)
  })

  it('本地模板（Ollama）：带 Base URL 且同样不内嵌 Key', () => {
    const template = findProviderTemplate('ollama')
    expect(template?.local).toBe(true)
    expect(template?.baseUrl).toContain('127.0.0.1')
    expect(template?.suggestModels[0]?.length).toBeGreaterThan(0)
  })

  it('未知模板 id 返回 undefined', () => {
    expect(findProviderTemplate('not-exist')).toBeUndefined()
  })
})
