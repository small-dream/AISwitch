import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useStartSubscriptionLogin } from '@/hooks/use-start-subscription-login'

const { startLogin, toastSuccess, toastError } = vi.hoisted(() => ({
  startLogin: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/app/composition', () => ({ subscriptionAuthService: { startLogin } }))
vi.mock('@/stores/toast-store', () => ({ toastSuccess, toastError }))

describe('useStartSubscriptionLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('启动成功后提示用户在浏览器完成授权', async () => {
    startLogin.mockResolvedValue(undefined)
    const { result } = renderHook(() => useStartSubscriptionLogin('codex'))

    act(() => {
      result.current.startLogin()
    })

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled()
    })
    expect(startLogin).toHaveBeenCalledWith('codex')
    expect(toastSuccess).toHaveBeenCalledWith(
      '已启动 Codex 登录，请在浏览器完成授权；若浏览器未打开，请复制上方命令到终端。'
    )
  })

  it('启动失败时把错误交给 Toast，而不是显示成功', async () => {
    startLogin.mockRejectedValue(new Error('Codex CLI not found'))
    const { result } = renderHook(() => useStartSubscriptionLogin('codex'))

    act(() => {
      result.current.startLogin()
    })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Codex CLI not found')
    })
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})
