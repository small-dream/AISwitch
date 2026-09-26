import { render } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import type { TargetTool } from '@/domain/entities/preset'
import { ModelFields } from '@/ui/features/preset-form/ModelFields'
import type { PresetFormValues } from '@/ui/features/preset-form/preset-form-schema'

vi.mock('@/hooks/use-model-catalog', () => ({
  useModelCatalog: () => ({ list: vi.fn(), pending: false }),
}))

function renderFields(tool: TargetTool, baseUrl: string) {
  function Harness() {
    const form = useForm<PresetFormValues>({ defaultValues: { tool, baseUrl } })
    return <ModelFields form={form} errors={{}} tool={tool} />
  }
  return render(<Harness />)
}

function optionValues(container: HTMLElement): string[] {
  return [...container.querySelectorAll('datalist option')].map(
    (option) => option.getAttribute('value') ?? ''
  )
}

describe('ModelFields · 模型名下拉候选', () => {
  it('OpenCode Go × Codex：候选含 DeepSeek，且输入框已挂上 datalist', () => {
    const { container } = renderFields('codex', 'https://opencode.ai/zen/go/v1')
    const options = optionValues(container)

    expect(options).toContain('deepseek-v4.1-flash')
    const input = container.querySelector('input[name="model"]')
    expect(input?.getAttribute('list')).toBe('aiswitch-model-candidates')
  })

  it('Claude Code：模型名与小模型共用同一份候选', () => {
    const { container } = renderFields('claude-code', 'https://opencode.ai/zen/go')

    expect(optionValues(container)).toContain('minimax-m3')
    expect(container.querySelector('input[name="smallFastModel"]')).not.toBeNull()
  })

  it('自定义地址：无候选时输入框不挂 datalist（保持纯手填）', () => {
    const { container } = renderFields('codex', 'https://my-relay.example.com/v1')

    expect(optionValues(container)).toEqual([])
    expect(container.querySelector('input[name="model"]')?.getAttribute('list')).toBeNull()
  })
})
