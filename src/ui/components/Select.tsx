import clsx from 'clsx'
import type { SelectHTMLAttributes } from 'react'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, ...rest }: SelectProps) {
  return (
    <select
      className={clsx(
        'h-9 w-full rounded-lg border border-app-border bg-app-input px-2 text-sm text-app',
        'transition-colors duration-150 focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30',
        className
      )}
      {...rest}
    />
  )
}
