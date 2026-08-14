import clsx from 'clsx'
import type { SelectHTMLAttributes } from 'react'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, ...rest }: SelectProps) {
  return (
    <select
      className={clsx(
        'h-9 w-full rounded-md border border-app-border-strong bg-app-input px-2 text-sm text-app',
        'focus:border-indigo-500 focus:outline-none',
        className
      )}
      {...rest}
    />
  )
}
