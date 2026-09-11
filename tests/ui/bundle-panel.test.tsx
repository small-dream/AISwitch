import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Bundle } from '@/domain/entities/bundle'
import type { Preset } from '@/domain/entities/preset'
import { BundlePanel } from '@/ui/features/bundles/BundlePanel'
import { makePreset } from '../helpers/make-preset'

const state = vi.hoisted(() => ({
  bundles: [] as Bundle[],
  presets: [] as Preset[],
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  removeMutate: vi.fn(),
  switchMutate: vi.fn(),
}))

vi.mock('@/hooks/use-bundles', () => ({
  useBundles: () => ({ data: state.bundles }),
  useCreateBundle: () => ({ isPending: false, mutate: state.createMutate }),
  useUpdateBundle: () => ({ isPending: false, mutate: state.updateMutate }),
  useRemoveBundle: () => ({ isPending: false, mutate: state.removeMutate }),
  useSwitchBundle: () => ({ isPending: false, mutate: state.switchMutate }),
}))

vi.mock('@/hooks/use-presets', () => ({
  usePresets: () => ({ data: state.presets }),
}))

vi.mock('@/stores/toast-store', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

function makeBundle(overrides: Partial<Bundle> = {}): Bundle {
  return {
    id: 'bundle-1',
    name: '全家 GLM',
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    ...overrides,
  }
}

function resetState() {
  vi.clearAllMocks()
  state.bundles = []
  state.presets = []
}

describe('BundlePanel 新建弹窗状态重置', () => {
  beforeEach(resetState)

  it('新建 → 输入后取消 → 再次新建：表单状态完全重置', () => {
    render(<BundlePanel />)

    fireEvent.click(screen.getByRole('button', { name: '新建组合' }))
    fireEvent.change(screen.getByLabelText('组合名称'), { target: { value: '残留草稿' } })
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '新建组合' }))
    expect(screen.getByLabelText('组合名称')).toHaveValue('')
  })

  it('新建 → 校验失败后取消 → 再次新建：错误提示不残留', () => {
    render(<BundlePanel />)

    fireEvent.click(screen.getByRole('button', { name: '新建组合' }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText('请至少选择一个工具的预设')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    fireEvent.click(screen.getByRole('button', { name: '新建组合' }))
    expect(screen.queryByText('请至少选择一个工具的预设')).not.toBeInTheDocument()
  })
})

describe('BundlePanel 编辑弹窗预填与重置', () => {
  beforeEach(resetState)

  it('编辑已有组合：弹窗预填名称与各工具预设选择', () => {
    const claude = makePreset({ id: 'preset-c', name: 'GLM-4.6' })
    const codex = makePreset({ id: 'preset-x', name: 'DeepSeek', tool: 'codex' })
    state.presets = [claude, codex]
    state.bundles = [
      makeBundle({ claudePresetId: 'preset-c', codexPresetId: 'preset-x' }),
    ]
    render(<BundlePanel />)

    fireEvent.click(screen.getByRole('button', { name: '编辑' }))

    expect(screen.getByText('编辑组合')).toBeInTheDocument()
    expect(screen.getByLabelText('组合名称')).toHaveValue('全家 GLM')
    const [claudeSelect, codexSelect] = screen.getAllByRole('combobox')
    expect(claudeSelect).toHaveValue('preset-c')
    expect(codexSelect).toHaveValue('preset-x')
  })

  it('编辑取消后再新建：不回显上一组合的编辑内容', () => {
    state.presets = [makePreset({ id: 'preset-c', name: 'GLM-4.6' })]
    state.bundles = [makeBundle({ claudePresetId: 'preset-c' })]
    render(<BundlePanel />)

    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    fireEvent.click(screen.getByRole('button', { name: '新建组合' }))

    expect(screen.getByRole('heading', { name: '新建组合' })).toBeInTheDocument()
    expect(screen.getByLabelText('组合名称')).toHaveValue('')
    const [claudeSelect] = screen.getAllByRole('combobox')
    expect(claudeSelect).toHaveValue('')
  })
})
