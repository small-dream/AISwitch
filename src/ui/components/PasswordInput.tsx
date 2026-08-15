import clsx from 'clsx'
import { Eye, EyeOff } from 'lucide-react'
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
        className={clsx('pr-9', className)}
      />
      <button
        type="button"
        aria-label={visible ? '隐藏密钥' : '显示密钥'}
        onClick={() => {
          setVisible((current) => !current)
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-app-faint transition-colors hover:text-app"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
