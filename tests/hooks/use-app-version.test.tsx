import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useAppVersion } from '@/hooks/use-app-version'

const { getAppVersion } = vi.hoisted(() => ({ getAppVersion: vi.fn() }))

vi.mock('@/adapters/system/app-meta', () => ({ getAppVersion }))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useAppVersion', () => {
  it('适配器成功时返回版本号', async () => {
    getAppVersion.mockResolvedValue('0.1.14')
    const { result } = renderHook(() => useAppVersion(), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe('0.1.14')
    })
  })

  it('适配器失败时回落为空串（UI 静默隐藏版本徽标）', async () => {
    getAppVersion.mockRejectedValue(new Error('no tauri'))
    const { result } = renderHook(() => useAppVersion(), { wrapper })

    await waitFor(() => {
      expect(getAppVersion).toHaveBeenCalled()
    })
    expect(result.current).toBe('')
  })
})
