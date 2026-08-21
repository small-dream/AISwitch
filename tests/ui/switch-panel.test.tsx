import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Preset } from '@/domain/entities/preset'
import { SwitchPanel } from '@/ui/features/switch-panel/SwitchPanel'
import { makePreset } from '../helpers/make-preset'

const state = vi.hoisted(() => ({
  presets: [] as Preset[],
  createMutate: vi.fn(),
}))

vi.mock('@/hooks/use-presets', () => ({
  usePresets: () => ({ data: state.presets, isLoading: false }),
  useCreatePreset: () => ({ isPending: false, mutate: state.createMutate }),
  useUpdatePreset: () => ({ isPending: false, mutate: vi.fn() }),
  useRemovePreset: () => ({ isPending: false, mutate: vi.fn() }),
}))

vi.mock('@/hooks/use-import-preset', () => ({
  useImportPreset: () => ({ isPending: false, mutate: vi.fn() }),
}))

vi.mock('@/hooks/use-connectivity-test', () => ({
  useConnectivityTest: () => ({ data: undefined, isPending: false, mutate: vi.fn() }),
}))

vi.mock('@/hooks/use-active-preset', () => ({
  useIsPresetActive: () => false,
}))

vi.mock('@/hooks/use-switch', () => ({
  useSwitchPreset: () => ({ isPending: false, mutate: vi.fn() }),
}))

vi.mock('@/stores/toast-store', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

function openDuplicate() {
  render(<SwitchPanel />)
  fireEvent.click(screen.getByRole('button', { name: '复制' }))
}

describe('SwitchPanel 复制预设 · 表单预填', () => {
  beforeEach(() => {
    state.createMutate.mockClear()
    state.presets = [makePreset({ id: 'preset-1', name: 'GLM-4.6', model: 'glm-4.6' })]
  })

  it('点击复制 → 弹窗打开并预填核心标识，名称带「副本」后缀', () => {
    openDuplicate()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('复制预设')).toBeInTheDocument()
    expect(screen.getByDisplayValue('GLM-4.6 副本')).toBeInTheDocument()
    expect(screen.getByDisplayValue('glm-4.6')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('claude-code')
  })

  it('复制草稿完整保留供应商 / Base URL / API Key', () => {
    openDuplicate()

    expect(screen.getByDisplayValue('智谱 GLM')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://open.bigmodel.cn/api/anthropic')).toBeInTheDocument()
    expect(screen.getByDisplayValue('sk-test-key')).toBeInTheDocument()
  })
})

describe('SwitchPanel 复制预设 · 保存链路', () => {
  beforeEach(() => {
    state.createMutate.mockClear()
    state.presets = [makePreset({ id: 'preset-1', name: 'GLM-4.6', model: 'glm-4.6' })]
  })

  it('修改复制草稿后保存 → 走 create 链路', async () => {
    openDuplicate()
    fireEvent.change(screen.getByDisplayValue('GLM-4.6 副本'), {
      target: { value: 'GLM-4.6 备用' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(state.createMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'GLM-4.6 备用',
          providerName: '智谱 GLM',
          baseUrl: 'https://open.bigmodel.cn/api/anthropic',
          apiKey: 'sk-test-key',
          model: 'glm-4.6',
          tool: 'claude-code',
        }),
        expect.anything()
      )
    })
  })

  it('codex 预设复制 → 模型元数据以 JSON 预填', () => {
    const metadata = { models: [{ slug: 'deepseek-v4-flash', context_window: 1048576 }] }
    state.presets = [
      makePreset({
        id: 'preset-2',
        name: 'DeepSeek',
        tool: 'codex',
        baseUrl: 'https://api.deepseek.com/',
        model: 'deepseek-v4-flash',
        modelMetadata: metadata,
      }),
    ]
    render(<SwitchPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Codex CLI' }))
    fireEvent.click(screen.getByRole('button', { name: '复制' }))
    fireEvent.click(screen.getByText('高级：模型目录条目（可选，仅 Codex 第三方模型需要）'))

    expect(screen.getByRole('combobox')).toHaveValue('codex')
    expect(
      screen.getByDisplayValue((value) => value.includes('context_window'))
    ).toBeInTheDocument()
  })
})
