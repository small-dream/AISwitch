import clsx from 'clsx'
import type { ReactNode } from 'react'

export interface CardProps {
  className?: string
  hoverable?: boolean
  children: ReactNode
}

export function Card({ className, hoverable = false, children }: CardProps) {
  return (
    <section
      className={clsx(
        'rounded-xl border border-app-border bg-app-card shadow-sm shadow-black/[0.03]',
        hoverable && 'transition-shadow duration-200 hover:shadow-md hover:shadow-black/[0.06]',
        className
      )}
    >
      {children}
    </section>
  )
}
