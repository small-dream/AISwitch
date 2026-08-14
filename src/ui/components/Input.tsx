import clsx from 'clsx'
import type { InputHTMLAttributes } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={clsx(
        'h-9 w-full rounded-md border border-app-border-strong bg-app-input px-3 text-sm text-app',
        'placeholder:text-app-faint focus:border-indigo-500 focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...rest}
    />
  )
}
