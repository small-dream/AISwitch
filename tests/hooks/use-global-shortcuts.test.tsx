import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { register, unregister, toastError } = vi.hoisted(() => ({
  register: vi.fn(),
  unregister: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/adapters/system/global-shortcuts', () => ({
  tauriGlobalShortcuts: { register, unregister },
}))

vi.mock('@/stores/toast-store', () => ({ toastSuccess: vi.fn(), toastError }))

vi.mock('@/app/composition', () => ({ switchService: { switch: vi.fn() } }))

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ show: vi.fn(), setFocus: vi.fn() }),
}))

import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    unregister.mockResolvedValue(undefined)
  })

  it('注册成功：两条快捷键都注册，且不产生失败提示', async () => {
    register.mockResolvedValue(undefined)

    renderHook(
      () => {
        useGlobalShortcuts()
      },
      { wrapper }
    )

    await waitFor(() => {
      expect(register).toHaveBeenCalledTimes(2)
    })
    expect(register.mock.calls[0]?.[0]).toBe('CmdOrCtrl+Shift+A')
    expect(register.mock.calls[1]?.[0]).toBe('CmdOrCtrl+Shift+S')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('注册失败：给出可见提示，而不是静默丢弃', async () => {
    register.mockRejectedValue(new Error('permission denied'))

    renderHook(
      () => {
        useGlobalShortcuts()
      },
      { wrapper }
    )

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledTimes(1)
    })
    expect(String(toastError.mock.calls[0]?.[0])).toContain('全局快捷键注册失败')
  })
})
