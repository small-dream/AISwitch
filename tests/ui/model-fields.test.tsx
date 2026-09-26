import { fireEvent, render, screen } from '@testing-library/react'
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

function modelInput(container: HTMLElement, name = 'model'): HTMLInputElement | null {
  return container.querySelector(`input[name="${name}"]`)
}

function optionTexts(): (string | null)[] {
  return screen.getAllByRole('option').map((item) => item.textContent)
}

describe('ModelFields · 模型名下拉候选', () => {
  it('Codex × OpenCode Go：点下拉按钮列出候选，选中即回填并收起', () => {
    const { container } = renderFields('codex', 'https://opencode.ai/zen/go/v1')

    fireEvent.click(screen.getByRole('button', { name: '模型名' }))

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(optionTexts()).toContain('deepseek-v4.1-flash')

    fireEvent.click(screen.getByRole('option', { name: 'deepseek-v4.1-flash' }))

    expect(modelInput(container)?.value).toBe('deepseek-v4.1-flash')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('候选按当前输入过滤（子串匹配、大小写无关）', () => {
    renderFields('codex', 'https://opencode.ai/zen/go/v1')

    fireEvent.change(screen.getByRole('textbox', { name: '模型名' }), {
      target: { value: 'GROK' },
    })
    fireEvent.click(screen.getByRole('button', { name: '模型名' }))

    expect(optionTexts()).toEqual(['grok-4.7', 'grok-4.6'])
  })

  it('Claude Code：小模型与模型名共用同一份候选', () => {
    const label = '小模型 ANTHROPIC_SMALL_FAST_MODEL（可选）'
    const { container } = renderFields('claude-code', 'https://opencode.ai/zen/go')

    fireEvent.click(screen.getByRole('button', { name: label }))
    fireEvent.click(screen.getByRole('option', { name: 'minimax-m3' }))

    expect(modelInput(container, 'smallFastModel')?.value).toBe('minimax-m3')
  })

  it('自定义地址：无候选时按钮仍在，弹层给出补齐提示且不渲染候选', () => {
    const { container } = renderFields('codex', 'https://my-relay.example.com/v1')

    fireEvent.click(screen.getByRole('button', { name: '模型名' }))

    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('获取模型')
    expect(modelInput(container)?.value).toBe('')
  })
})
