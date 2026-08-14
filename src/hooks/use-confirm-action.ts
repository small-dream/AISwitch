import { useState } from 'react'

/** 两段式确认动作：首次点击进入确认态，限时内再次点击才真正执行（无原生弹窗依赖） */
export function useConfirmAction(action: () => void, resetMs = 3000) {
  const [confirming, setConfirming] = useState(false)

  const trigger = () => {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => {
        setConfirming(false)
      }, resetMs)
      return
    }
    setConfirming(false)
    action()
  }

  return { confirming, trigger }
}
