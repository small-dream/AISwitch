import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Preset } from '@/domain/entities/preset'
import { SwitchPanel } from '@/ui/features/switch-panel/SwitchPanel'

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

vi.mock('@/hooks/use-active-preset', () => ({ useIsPresetActive: () => false }))
vi.mock('@/hooks/use-tool-status', () => ({ useToolStatus: () => ({ data: [] }) }))
vi.mock('@/hooks/use-subscription-auth', () => ({
  useSubscriptionAuth: (tool: string) => ({ data: { tool, state: 'logged-out' } }),
}))
vi.mock('@/hooks/use-switch', () => ({
  useSwitchPreset: () => ({ isPending: false, mutate: vi.fn() }),
  useClearManaged: () => ({ isPending: false, mutate: vi.fn() }),
}))
vi.mock('@/stores/toast-store', () => ({ toastSuccess: vi.fn(), toastError: vi.fn() }))
vi.mock('@/hooks/use-model-catalog', () => ({
  useModelCatalog: () => ({ list: vi.fn(), pending: false }),
}))

const METADATA_SUMMARY = '高级：模型目录条目（可选，仅 Codex 第三方模型需要）'

function openCreate(toolLabel: 'Claude Code' | 'Codex CLI'): void {
  render(<SwitchPanel />)
  fireEvent.click(screen.getByRole('button', { name: toolLabel }))
  fireEvent.click(screen.getByRole('button', { name: '新建预设' }))
}

function pickTemplate(value: string): void {
  fireEvent.change(screen.getByRole('combobox', { name: '从供应商模板填充' }), {
    target: { value },
  })
}

describe('PresetForm 模板填充', () => {
  beforeEach(() => {
    state.createMutate.mockClear()
    state.presets = []
  })

  it('应用模板不清空用户已填的 API Key（编辑/新建都不会静默丢密钥）', async () => {
    openCreate('Claude Code')
    const apiKey = screen.getByPlaceholderText('sk-…')
    fireEvent.change(apiKey, { target: { value: 'sk-typed-by-user' } })

    pickTemplate('glm')

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: '模型名' })).toHaveValue('glm-5.3')
    })
    expect(apiKey).toHaveValue('sk-typed-by-user')
  })

  it('应用模板清空上一家的模型目录元数据（避免 slug 与模型对不上）', async () => {
    openCreate('Codex CLI')
    fireEvent.click(screen.getByText(METADATA_SUMMARY))
    const metadata = screen.getByPlaceholderText(/context_window/)
    fireEvent.change(metadata, {
      target: { value: '{"models":[{"slug":"old-model","context_window":1}]}' },
    })

    pickTemplate('deepseek')

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: '模型名' })).toHaveValue('deepseek-v4-pro')
    })
    expect(metadata).toHaveValue('')
  })
})

describe('PresetForm Codex 元数据校验', () => {
  beforeEach(() => {
    state.createMutate.mockClear()
    state.presets = []
  })

  it('元数据非法：高级区自动展开并给出可见错误', async () => {
    openCreate('Codex CLI')
    fireEvent.click(screen.getByText(METADATA_SUMMARY))
    fireEvent.change(screen.getByPlaceholderText(/context_window/), {
      target: { value: '{oops' },
    })

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByText('不是合法 JSON')).toBeInTheDocument()
    const hint = await screen.findByText('元数据有误')
    expect(hint.closest('details')?.open).toBe(true)
    expect(state.createMutate).not.toHaveBeenCalled()
  })
})
