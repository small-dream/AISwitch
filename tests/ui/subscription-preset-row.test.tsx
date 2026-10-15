import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ToolStatus } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { SubscriptionPresetRow } from '@/ui/features/switch-panel/SubscriptionPresetRow'
import { makePreset } from '../helpers/make-preset'

const mutate = vi.fn<(tool: string, options: { onSuccess: () => void }) => void>()
const state = vi.hoisted(() => ({
  auth: undefined as SubscriptionAuthStatus | undefined,
  statuses: [] as ToolStatus[],
}))

vi.mock('@/hooks/use-subscription-auth', () => ({
  useSubscriptionAuth: (tool: string) => ({ data: state.auth ?? { tool, state: 'unknown' } }),
}))

vi.mock('@/hooks/use-tool-status', () => ({
  useToolStatus: () => ({ data: state.statuses }),
}))

vi.mock('@/hooks/use-switch', () => ({
  useClearManaged: () => ({ isPending: false, mutate }),
}))

vi.mock('@/stores/toast-store', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

function makeStatus(overrides: Partial<ToolStatus> = {}): ToolStatus {
  return { tool: 'claude-code', status: 'installed', activeProviderName: '官方 API', ...overrides }
}

beforeEach(() => {
  mutate.mockClear()
  state.auth = { tool: 'claude-code', state: 'logged-in' }
  state.statuses = []
})

describe('SubscriptionPresetRow', () => {
  it('展示内建条目与登录态，不展示模型名', () => {
    render(<SubscriptionPresetRow tool="claude-code" presets={[makePreset()]} />)

    expect(screen.getByText('官方订阅')).toBeInTheDocument()
    expect(screen.getByText('已登录')).toBeInTheDocument()
    expect(screen.queryByText('glm-4.6')).toBeNull()
  })

  it('未登录时给出未登录徽标', () => {
    state.auth = { tool: 'claude-code', state: 'logged-out' }
    render(<SubscriptionPresetRow tool="claude-code" presets={[]} />)

    expect(screen.getByText('未登录')).toBeInTheDocument()
  })

  it('点击切换 → 清空该工具托管键（走 clearManaged，不经过预设）', () => {
    render(<SubscriptionPresetRow tool="claude-code" presets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: '切换到官方订阅' }))

    const call = mutate.mock.calls[0]
    expect(call?.[0]).toBe('claude-code')
    expect(typeof call?.[1].onSuccess).toBe('function')
  })

  it('无预设生效且不在中转上 → 标记为当前', () => {
    state.statuses = [makeStatus({ activeModel: 'claude-sonnet-5' })]
    render(<SubscriptionPresetRow tool="claude-code" presets={[]} />)

    expect(screen.getByText('当前')).toBeInTheDocument()
  })

  it('有预设生效（含官方 API 预设）时不标记为当前', () => {
    state.statuses = [makeStatus({ activeModel: 'glm-4.6' })]
    render(
      <SubscriptionPresetRow
        tool="claude-code"
        presets={[makePreset({ baseUrl: undefined })]}
      />
    )

    expect(screen.queryByText('当前')).toBeNull()
  })
})
