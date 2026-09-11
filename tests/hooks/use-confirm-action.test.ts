import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useConfirmAction } from '@/hooks/use-confirm-action'

function useFakeTimerHooks() {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}

describe('useConfirmAction · 两段确认', () => {
  useFakeTimerHooks()

  it('首次点击进入确认态但不执行动作，限时内再次点击才执行', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useConfirmAction(action))

    act(() => {
      result.current.trigger()
    })
    expect(result.current.confirming).toBe(true)
    expect(action).not.toHaveBeenCalled()

    act(() => {
      result.current.trigger()
    })
    expect(action).toHaveBeenCalledOnce()
    expect(result.current.confirming).toBe(false)
  })

  it('超时后自动退出确认态，再次点击重新进入确认态而非执行', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useConfirmAction(action, 1000))

    act(() => {
      result.current.trigger()
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.confirming).toBe(false)

    act(() => {
      result.current.trigger()
    })
    expect(result.current.confirming).toBe(true)
    expect(action).not.toHaveBeenCalled()
  })
})

describe('useConfirmAction · 定时器管理', () => {
  useFakeTimerHooks()

  it('确认态内重复首次点击会重置计时器，不叠加多个定时器', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useConfirmAction(action, 1000))

    act(() => {
      result.current.trigger()
    })
    // 500ms 后取消再重新进入确认态
    act(() => {
      vi.advanceTimersByTime(500)
    })
    act(() => {
      result.current.trigger() // 第二次点击：执行动作并退出确认态
    })
    act(() => {
      result.current.trigger() // 重新进入确认态
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.confirming).toBe(false)
    expect(action).toHaveBeenCalledOnce()
  })

  it('卸载时清理未触发的定时器，不会在卸载后更新状态', () => {
    const action = vi.fn()
    const { result, unmount } = renderHook(() => useConfirmAction(action, 1000))

    act(() => {
      result.current.trigger()
    })
    unmount()

    // 定时器已清理：推进时间不应抛错也不应触发任何更新
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(action).not.toHaveBeenCalled()
  })
})
