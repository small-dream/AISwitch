import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { switchPreset, clearManaged, rollback } = vi.hoisted(() => ({
  switchPreset: vi.fn(),
  clearManaged: vi.fn(),
  rollback: vi.fn(),
}))

vi.mock('@/app/composition', () => ({
  switchService: { switch: switchPreset, clearManaged, rollback },
}))

import { useClearManaged, useRollback, useSwitchPreset } from '@/hooks/use-switch'

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function makeClient(): QueryClient {
  return new QueryClient({ defaultOptions: { mutations: { retry: false } } })
}

describe('use-switch 缓存失效', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('切换失败也要失效探测状态 / 备份 / 登录态（回滚失败时磁盘状态已变）', async () => {
    switchPreset.mockRejectedValue(new Error('boom'))
    const client = makeClient()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useSwitchPreset(), { wrapper: makeWrapper(client) })

    act(() => {
      result.current.mutate({ tool: 'claude-code', presetId: 'preset-1' })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['tool-status'] })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['backups'] })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['subscription-auth'] })
  })

  it('切换成功同样失效三类缓存', async () => {
    switchPreset.mockResolvedValue({ tool: 'claude-code', appliedAt: 'now' })
    const client = makeClient()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useSwitchPreset(), { wrapper: makeWrapper(client) })

    act(() => {
      result.current.mutate({ tool: 'claude-code', presetId: 'preset-1' })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(spy).toHaveBeenCalledTimes(3)
  })
})

describe('use-switch · 订阅与回滚', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('官方订阅与回滚同样在失败时失效', async () => {
    clearManaged.mockRejectedValue(new Error('boom'))
    rollback.mockRejectedValue(new Error('boom'))
    const client = makeClient()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const clear = renderHook(() => useClearManaged(), { wrapper: makeWrapper(client) })
    const undo = renderHook(() => useRollback(), { wrapper: makeWrapper(client) })

    act(() => {
      clear.result.current.mutate({ tool: 'codex' })
    })
    await waitFor(() => {
      expect(clear.result.current.isError).toBe(true)
    })
    act(() => {
      undo.result.current.mutate('codex')
    })
    await waitFor(() => {
      expect(undo.result.current.isError).toBe(true)
    })

    expect(spy).toHaveBeenCalledWith({ queryKey: ['tool-status'] })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['backups'] })
  })
})
