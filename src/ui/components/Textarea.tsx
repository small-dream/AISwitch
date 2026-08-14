import clsx from 'clsx'
import type { TextareaHTMLAttributes } from 'react'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-md border border-app-border-strong bg-app-input px-3 py-2 text-sm text-app',
        'placeholder:text-app-faint focus:border-indigo-500 focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...rest}
    />
  )
}
