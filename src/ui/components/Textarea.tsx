import clsx from 'clsx'
import type { TextareaHTMLAttributes } from 'react'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-lg border border-app-border bg-app-input px-3 py-2 text-sm text-app',
        'placeholder:text-app-faint',
        'transition-colors duration-150 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...rest}
    />
  )
}
