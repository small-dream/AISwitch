import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TargetTool } from '@/domain/entities/preset'
import { ModelFields } from '@/ui/features/preset-form/ModelFields'
import type { PresetFormValues } from '@/ui/features/preset-form/preset-form-schema'

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }))

vi.mock('@/hooks/use-model-catalog', () => ({
  useModelCatalog: () => ({ list: listMock, pending: false }),
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

function openList(label = '模型名') {
  fireEvent.click(screen.getByRole('button', { name: label }))
}

/** 打开下拉并按真实点击顺序（mousedown → click）选中一项 */
function pickModel(name: string) {
  openList()
  const option = screen.getByRole('option', { name })
  fireEvent.mouseDown(option)
  fireEvent.click(option)
}

beforeEach(() => {
  listMock.mockReset()
  // 默认挂起：只关心模板推荐的用例无须处理「打开即自动拉取」带来的状态更新
  listMock.mockReturnValue(new Promise(() => undefined))
})

describe('ModelFields · 下拉交互', () => {
  it('Codex × OpenCode Go：点下拉按钮列出候选并标注来源，选中即回填并收起', () => {
    const { container } = renderFields('codex', 'https://opencode.ai/zen/go/v1')

    openList()

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('模板推荐（子集）')).toBeInTheDocument()
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
    openList()

    expect(optionTexts()).toEqual(['grok-4.7', 'grok-4.6'])
  })

  it('真实点击顺序（mousedown 后 click）也能回填，弹层不会被点击先关掉', () => {
    const { container } = renderFields('codex', 'https://opencode.ai/zen/go/v1')

    pickModel('grok-4.7')

    expect(modelInput(container)?.value).toBe('grok-4.7')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('选中一项后再打开：仍列出全部候选，不被已回填的模型名过滤掉', () => {
    renderFields('codex', 'https://opencode.ai/zen/go/v1')

    pickModel('grok-4.7')
    openList()

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(optionTexts()).toHaveLength(5)
  })
})

describe('ModelFields · 候选来源与自动补全', () => {
  it('自定义地址：无候选时按钮仍在，弹层给出补齐提示且不渲染候选', () => {
    const { container } = renderFields('codex', 'https://my-relay.example.com/v1')

    openList()

    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('获取模型')
    expect(modelInput(container)?.value).toBe('')
  })

  it('打开下拉时自动补一次供应商目录，并按来源分组（目录去掉与推荐重复的条目）', async () => {
    listMock.mockResolvedValue({ status: 'ok', models: ['grok-4.7', 'kimi-k3'] })
    renderFields('codex', 'https://opencode.ai/zen/go/v1')

    openList()

    await waitFor(() => {
      expect(screen.getByText('供应商目录 · 1 个')).toBeInTheDocument()
    })
    expect(screen.getByText('模板推荐（子集）')).toBeInTheDocument()
    expect(optionTexts()).toContain('kimi-k3')
    expect(listMock).toHaveBeenCalledTimes(1)
  })

  it('自动补全只做一次，重新打开下拉不会重复请求', async () => {
    listMock.mockResolvedValue({ status: 'error', message: 'mock failure' })
    renderFields('codex', 'https://opencode.ai/zen/go/v1')

    openList()
    await waitFor(() => {
      expect(listMock).toHaveBeenCalledTimes(1)
    })
    openList()
    openList()

    expect(listMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('模板推荐（子集）')).toBeInTheDocument()
  })
})
