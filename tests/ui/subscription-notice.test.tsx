import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Preset } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { SubscriptionNotice } from '@/ui/features/switch-panel/SubscriptionNotice'
import { makePreset } from '../helpers/make-preset'

const state = vi.hoisted(() => ({
  presets: [] as Preset[],
  status: undefined as SubscriptionAuthStatus | undefined,
}))

vi.mock('@/hooks/use-presets', () => ({
  usePresets: () => ({ data: state.presets }),
}))

vi.mock('@/hooks/use-subscription-auth', () => ({
  useSubscriptionAuth: () => ({ data: state.status }),
}))

const writeText = vi.fn(() => Promise.resolve())

beforeEach(() => {
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  state.presets = [makePreset()]
  state.status = { tool: 'claude-code', state: 'logged-out' }
})

describe('SubscriptionNotice', () => {
  it('官方订阅是内建能力：没有订阅预设时也照常展示登录提示', () => {
    state.presets = [makePreset()]
    const { container } = render(<SubscriptionNotice tool="claude-code" />)

    expect(container).not.toBeEmptyDOMElement()
    expect(screen.getByText('官方订阅登录')).toBeInTheDocument()
  })

  it('未登录时提示登录并给出终端命令', () => {
    render(<SubscriptionNotice tool="claude-code" />)

    expect(screen.getByText('官方订阅登录')).toBeInTheDocument()
    expect(screen.getByText(/未检测到登录凭据/)).toBeInTheDocument()
    expect(screen.getByText('claude')).toBeInTheDocument()
    expect(screen.getByText('/status')).toBeInTheDocument()
    expect(screen.getByText(/输入 \/login/)).toBeInTheDocument()
  })

  it('已登录时展示订阅类型', () => {
    state.status = { tool: 'claude-code', state: 'logged-in', plan: 'Max' }
    render(<SubscriptionNotice tool="claude-code" />)

    expect(screen.getByText(/Max/)).toBeInTheDocument()
  })

  it('点击复制命令只复制终端登录命令并给出已复制反馈', async () => {
    render(<SubscriptionNotice tool="claude-code" />)
    fireEvent.click(screen.getByRole('button', { name: /复制命令/ }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('claude')
    })
    expect(await screen.findByText('已复制')).toBeInTheDocument()
  })

  it('Codex 使用 codex login 命令', () => {
    state.presets = [makePreset({ tool: 'codex' })]
    render(<SubscriptionNotice tool="codex" />)

    expect(screen.getByText('codex login')).toBeInTheDocument()
  })
})
