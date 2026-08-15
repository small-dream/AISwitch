import clsx from 'clsx'
import type { InputHTMLAttributes } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={clsx(
        'h-9 w-full rounded-lg border border-app-border bg-app-input px-3 text-sm text-app',
        'placeholder:text-app-faint',
        'transition-colors duration-150 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...rest}
    />
  )
}
