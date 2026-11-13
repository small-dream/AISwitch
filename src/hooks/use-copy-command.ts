import { useEffect, useState } from 'react'

/** 复制文本到剪贴板，并在 2 秒后复位；失败时保持未复制状态 */
export function useCopyCommand(text: string) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) {
      return undefined
    }
    const timer = setTimeout(() => {
      setCopied(false)
    }, 2000)
    return () => {
      clearTimeout(timer)
    }
  }, [copied])
  const copy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
      })
      .catch(() => {
        setCopied(false)
      })
  }
  return { copied, copy }
}
