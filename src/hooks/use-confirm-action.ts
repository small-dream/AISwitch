import { useEffect, useRef, useState } from 'react'

/** 两段式确认动作：首次点击进入确认态，限时内再次点击才真正执行（无原生弹窗依赖） */
export function useConfirmAction(action: () => void, resetMs = 3000) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    },
    []
  )

  const trigger = () => {
    if (!confirming) {
      clearTimer()
      setConfirming(true)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setConfirming(false)
      }, resetMs)
      return
    }
    clearTimer()
    setConfirming(false)
    action()
  }

  return { confirming, trigger }
}
