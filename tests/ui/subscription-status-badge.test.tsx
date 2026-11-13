import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { SubscriptionStatusBadge } from '@/ui/features/switch-panel/SubscriptionStatusBadge'

const writeText = vi.fn(() => Promise.resolve())
const startLogin = vi.fn()

vi.mock('@/hooks/use-start-subscription-login', () => ({
  useStartSubscriptionLogin: () => ({ isPending: false, startLogin }),
}))

beforeEach(() => {
  writeText.mockClear()
  startLogin.mockClear()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

function renderBadge(
  status: SubscriptionAuthStatus,
  tool: 'claude-code' | 'codex' = 'claude-code'
) {
  return render(<SubscriptionStatusBadge tool={tool} status={status} />)
}

/** 徽标即触发器：悬停 / 聚焦才展开登录引导气泡 */
function badge(name: string) {
  return screen.getByRole('button', { name })
}

describe('SubscriptionStatusBadge · 展开与收起', () => {
  it('常态只有一枚徽标，登录命令与说明不占版面', () => {
    renderBadge({ tool: 'claude-code', state: 'logged-out' })

    expect(badge('未登录')).toBeInTheDocument()
    expect(screen.queryByText('官方订阅登录')).toBeNull()
    expect(screen.queryByText(/未检测到登录凭据/)).toBeNull()
  })

  it('悬停展开：给出登录命令、账号查询与终端步骤', () => {
    renderBadge({ tool: 'claude-code', state: 'logged-out' })
    fireEvent.mouseEnter(badge('未登录'))

    expect(screen.getByText('官方订阅登录')).toBeInTheDocument()
    expect(screen.getByText(/未检测到登录凭据/)).toBeInTheDocument()
    expect(screen.getByText('claude')).toBeInTheDocument()
    expect(screen.getByText('/status')).toBeInTheDocument()
    expect(screen.getByText(/输入 \/login/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '官方登录说明' })).toBeInTheDocument()
  })

  it('鼠标移出即收起', () => {
    renderBadge({ tool: 'claude-code', state: 'logged-out' })
    const trigger = badge('未登录')
    fireEvent.mouseEnter(trigger)
    fireEvent.mouseLeave(trigger)

    expect(screen.queryByText('官方订阅登录')).toBeNull()
  })

  it('键盘聚焦也展开（不依赖鼠标）', () => {
    renderBadge({ tool: 'claude-code', state: 'logged-out' })
    fireEvent.focus(badge('未登录'))

    expect(screen.getByText(/未检测到登录凭据/)).toBeInTheDocument()
  })

  it('已登录时给出订阅类型', () => {
    renderBadge({ tool: 'claude-code', state: 'logged-in', plan: 'Max' })
    fireEvent.mouseEnter(badge('已登录'))

    expect(screen.getByText(/Max/)).toBeInTheDocument()
  })

  it('解析失败时提示在 CLI 内确认，而非误报未登录', () => {
    renderBadge({ tool: 'claude-code', state: 'unknown' })
    fireEvent.mouseEnter(badge('登录态未知'))

    expect(screen.getByText(/配置存在但无法解析/)).toBeInTheDocument()
  })
})

describe('SubscriptionStatusBadge · 登录命令', () => {
  it('点击复制只复制终端登录命令并给出已复制反馈', async () => {
    renderBadge({ tool: 'claude-code', state: 'logged-out' })
    fireEvent.mouseEnter(badge('未登录'))
    fireEvent.click(screen.getByRole('button', { name: /复制命令/ }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('claude')
    })
    expect(await screen.findByText('已复制')).toBeInTheDocument()
  })

  it('Codex 使用 codex login 命令', () => {
    renderBadge({ tool: 'codex', state: 'logged-out' }, 'codex')
    fireEvent.mouseEnter(badge('未登录'))

    expect(screen.getByText('codex login')).toBeInTheDocument()
  })

  it('Codex 探测到 CLI 路径时使用绝对路径登录与状态命令', () => {
    const executable = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex'
    renderBadge({ tool: 'codex', state: 'logged-out', cliExecutable: executable }, 'codex')
    fireEvent.mouseEnter(badge('未登录'))

    expect(screen.getByText(`${executable} login`)).toBeInTheDocument()
    expect(screen.getByText(`${executable} login status`)).toBeInTheDocument()
  })

  it('Codex 气泡可直接启动浏览器登录', () => {
    renderBadge({ tool: 'codex', state: 'logged-out' }, 'codex')
    fireEvent.mouseEnter(badge('未登录'))
    fireEvent.click(screen.getByRole('button', { name: '打开浏览器登录' }))

    expect(startLogin).toHaveBeenCalledOnce()
  })

  it('Claude Code 不展示直接登录按钮（登录需在 CLI 内完成）', () => {
    renderBadge({ tool: 'claude-code', state: 'logged-out' })
    fireEvent.mouseEnter(badge('未登录'))

    expect(screen.queryByRole('button', { name: '打开浏览器登录' })).toBeNull()
  })

  it('已登录时不在气泡内重复展示直接登录按钮', () => {
    renderBadge({ tool: 'codex', state: 'logged-in' }, 'codex')
    fireEvent.mouseEnter(badge('已登录'))

    expect(screen.queryByRole('button', { name: '打开浏览器登录' })).toBeNull()
  })
})
