import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConnectivityResult } from '@/domain/entities/connectivity'
import { PresetRow } from '@/ui/features/switch-panel/PresetRow'
import { makePreset } from '../helpers/make-preset'

const mutate = vi.fn()
const testState = vi.hoisted(() => ({
  data: undefined as ConnectivityResult | undefined,
  isPending: false,
}))

vi.mock('@/hooks/use-connectivity-test', () => ({
  useConnectivityTest: () => ({
    data: testState.data,
    isPending: testState.isPending,
    mutate,
  }),
}))

vi.mock('@/hooks/use-active-preset', () => ({
  useIsPresetActive: () => false,
}))

vi.mock('@/hooks/use-presets', () => ({
  useRemovePreset: () => ({ isPending: false, mutate: vi.fn() }),
}))

vi.mock('@/hooks/use-switch', () => ({
  useSwitchPreset: () => ({ isPending: false, mutate: vi.fn() }),
}))

vi.mock('@/stores/toast-store', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

describe('PresetRow 连通性测试', () => {
  beforeEach(() => {
    testState.data = undefined
    testState.isPending = false
    mutate.mockClear()
  })

  it('点击测试按钮触发探测', () => {
    const preset = makePreset({ name: 'GLM-4.6' })
    render(<PresetRow preset={preset} onEdit={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '测试' }))

    expect(mutate).toHaveBeenCalledWith(preset)
  })

  it('测试结果内联展示在信息列', () => {
    testState.data = { status: 'ok', latencyMs: 123, message: '连通正常（123ms）' }
    const preset = makePreset({ name: 'GLM-4.6' })
    render(<PresetRow preset={preset} onEdit={vi.fn()} />)

    expect(screen.getByText('连通正常（123ms）')).toBeInTheDocument()
  })

  it('探测中禁用测试按钮', () => {
    testState.isPending = true
    const preset = makePreset({ name: 'GLM-4.6' })
    render(<PresetRow preset={preset} onEdit={vi.fn()} />)

    expect(screen.getByRole('button', { name: '测试中…' })).toBeDisabled()
  })

  it('展示后端返回的详细错误信息', () => {
    testState.data = {
      status: 'unreachable',
      message: '已阻止探测：明文 http 地址仅允许本机回环，请改用 https',
    }
    const preset = makePreset({ name: 'GLM-4.6' })
    render(<PresetRow preset={preset} onEdit={vi.fn()} />)

    expect(
      screen.getByText('已阻止探测：明文 http 地址仅允许本机回环，请改用 https')
    ).toBeInTheDocument()
  })
})
