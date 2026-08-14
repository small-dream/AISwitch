import clsx from 'clsx'
import { useState } from 'react'
import { Input, type InputProps } from './Input'

/** API Key 输入框：默认遮蔽，可切换明文（PRD US-02） */
export function PasswordInput({ className, ...rest }: InputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        {...rest}
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        className={clsx('pr-12', className)}
      />
      <button
        type="button"
        onClick={() => {
          setVisible((current) => !current)
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-xs text-zinc-400 hover:text-zinc-200"
      >
        {visible ? '隐藏' : '显示'}
      </button>
    </div>
  )
}
