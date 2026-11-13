import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ToolStatus } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { AppError } from '@/domain/errors'
import { SubscriptionPresetRow } from '@/ui/features/switch-panel/SubscriptionPresetRow'
import { makePreset } from '../helpers/make-preset'

interface MutationOptions {
  onSuccess: () => void
  onError: (error: unknown) => void
}

interface ClearManagedArgs {
  tool: string
  options?: { removeConflicts?: boolean }
}

const mutate = vi.fn<(args: ClearManagedArgs, options: MutationOptions) => void>()
const startLogin = vi.fn()
const writeText = vi.fn(() => Promise.resolve())
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

vi.mock('@/hooks/use-start-subscription-login', () => ({
  useStartSubscriptionLogin: () => ({ isPending: false, startLogin }),
}))

vi.mock('@/stores/toast-store', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

function makeStatus(overrides: Partial<ToolStatus> = {}): ToolStatus {
  return { tool: 'claude-code', status: 'installed', activeProviderName: '官方 API', ...overrides }
}

beforeEach(() => {
  mutate.mockReset()
  startLogin.mockReset()
  state.auth = { tool: 'claude-code', state: 'logged-in' }
  state.statuses = []
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
})

describe('SubscriptionPresetRow', () => {
  it('展示内建条目与登录态，不展示模型名', () => {
    render(<SubscriptionPresetRow tool="claude-code" presets={[makePreset()]} />)

    expect(screen.getByText('官方订阅')).toBeInTheDocument()
    expect(screen.getByText('已登录')).toBeInTheDocument()
    expect(screen.queryByText('glm-4.6')).toBeNull()
    // 登录命令等细节收进徽标气泡，常态不占版面
    expect(screen.queryByText('官方订阅登录')).toBeNull()
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
    expect(call?.[0]).toEqual({ tool: 'claude-code', options: undefined })
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
      <SubscriptionPresetRow tool="claude-code" presets={[makePreset({ baseUrl: undefined })]} />
    )

    expect(screen.queryByText('当前')).toBeNull()
  })

  it('自建 provider 块（展示名不是 URL）仍在自定义供应商上 → 不标记为当前', () => {
    state.statuses = [
      {
        tool: 'codex',
        status: 'installed',
        activeModel: 'deepseek-v4-pro',
        activeProviderName: 'DeepSeek',
        activeProviderUrl: 'https://api.deepseek.com/v1',
      },
    ]
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    expect(screen.queryByText('当前')).toBeNull()
  })
})

describe('SubscriptionPresetRow · Codex 登录守卫提示', () => {
  beforeEach(() => {
    mutate.mockReset()
    state.auth = { tool: 'codex', state: 'logged-out' }
    state.statuses = []
  })

  it('未登录时行内提示先登录，避免直接切换', () => {
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    expect(
      screen.getByText('切换前请先登录官方账号，否则 Codex 会无法加载账号。')
    ).toBeInTheDocument()
  })

  it('登录态未知时提示查看登录态徽标里的状态命令，而不是断言未登录', () => {
    state.auth = { tool: 'codex', state: 'unknown' }
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    expect(
      screen.getByText('无法确认 Codex 登录态，请先展开登录态徽标，在终端运行其中的状态命令确认。')
    ).toBeInTheDocument()
  })
})

describe('SubscriptionPresetRow · Codex 登录守卫弹窗', () => {
  beforeEach(() => {
    mutate.mockReset()
    state.auth = { tool: 'codex', state: 'logged-out' }
    state.statuses = []
  })

  it('点击切换 → 弹出登录引导而不是静默清空', () => {
    mutate.mockImplementation((_tool, options) => {
      options.onError(
        new AppError('E_SUBSCRIPTION_LOGIN_REQUIRED', '需要先登录', { state: 'logged-out' })
      )
    })
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: '切换到官方订阅' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('请先登录 Codex 官方账号')).toBeInTheDocument()
    expect(screen.getByText('codex login')).toBeInTheDocument()
  })
})

describe('SubscriptionPresetRow · Codex 登录守卫弹窗操作', () => {
  beforeEach(() => {
    mutate.mockReset()
    state.auth = { tool: 'codex', state: 'logged-out' }
    state.statuses = []
  })

  it('登录引导可直接启动 Codex 登录，不再要求先复制命令', () => {
    mutate.mockImplementation((_tool, options) => {
      options.onError(
        new AppError('E_SUBSCRIPTION_LOGIN_REQUIRED', '需要先登录', { state: 'logged-out' })
      )
    })
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: '切换到官方订阅' }))
    fireEvent.click(screen.getByRole('button', { name: '打开浏览器登录' }))

    expect(startLogin).toHaveBeenCalledOnce()
  })

  it('探测到 CLI 路径时，登录引导给出可直接执行的绝对路径命令', () => {
    state.auth = {
      tool: 'codex',
      state: 'logged-out',
      cliExecutable: '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex',
    }
    mutate.mockImplementation((_tool, options) => {
      options.onError(
        new AppError('E_SUBSCRIPTION_LOGIN_REQUIRED', '需要先登录', { state: 'logged-out' })
      )
    })
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: '切换到官方订阅' }))

    expect(
      screen.getByText('/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex login')
    ).toBeInTheDocument()
  })

  it('登录引导里的重试会再次尝试切换', () => {
    mutate.mockImplementation((_tool, options) => {
      options.onError(
        new AppError('E_SUBSCRIPTION_LOGIN_REQUIRED', '需要先登录', { state: 'logged-out' })
      )
    })
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: '切换到官方订阅' }))
    fireEvent.click(screen.getByRole('button', { name: '我已登录，重试' }))

    expect(mutate).toHaveBeenCalledTimes(2)
  })
})

describe('SubscriptionPresetRow · Codex 登录方式冲突', () => {
  beforeEach(() => {
    mutate.mockReset()
    state.auth = { tool: 'codex', state: 'logged-in' }
    state.statuses = []
  })

  it('检测到 forced_login_method 冲突 → 确认后才带 removeConflicts 重试', () => {
    mutate.mockImplementation((_args, options) => {
      options.onError(
        new AppError('E_SUBSCRIPTION_CONFLICT_REQUIRED', '检测到冲突', {
          conflicts: [{ key: 'forced_login_method', value: 'api' }],
        })
      )
    })
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: '切换到官方订阅' }))

    expect(screen.getByText('检测到 Codex 登录方式冲突')).toBeInTheDocument()
    expect(screen.getByText(/强制使用 API Key 登录/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '移除并切换' }))

    expect(mutate).toHaveBeenLastCalledWith(
      { tool: 'codex', options: { removeConflicts: true } },
      expect.any(Object)
    )
  })
})

describe('SubscriptionPresetRow · Codex 成功引导', () => {
  beforeEach(() => {
    mutate.mockReset()
    state.auth = { tool: 'codex', state: 'logged-in' }
    state.statuses = []
  })

  it('切换成功后展示可复制的 codex login 引导', async () => {
    mutate.mockImplementation((_args, options) => {
      options.onSuccess()
    })
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: '切换到官方订阅' }))

    expect(screen.getByText('已切换到 Codex 官方订阅')).toBeInTheDocument()
    expect(screen.getByText(/couldn't load your account/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /复制命令/ }))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('codex login')
    })
  })

  it('成功引导同样可直接启动 Codex 登录', () => {
    mutate.mockImplementation((_args, options) => {
      options.onSuccess()
    })
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: '切换到官方订阅' }))
    fireEvent.click(screen.getByRole('button', { name: '打开浏览器登录' }))

    expect(startLogin).toHaveBeenCalledOnce()
  })

  it('探测到 CLI 路径时，成功引导复制绝对路径命令', async () => {
    state.auth = {
      tool: 'codex',
      state: 'logged-in',
      cliExecutable: '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex',
    }
    mutate.mockImplementation((_args, options) => {
      options.onSuccess()
    })
    render(<SubscriptionPresetRow tool="codex" presets={[]} />)

    fireEvent.click(screen.getByRole('button', { name: '切换到官方订阅' }))
    fireEvent.click(screen.getByRole('button', { name: /复制命令/ }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex login'
      )
    })
  })
})
