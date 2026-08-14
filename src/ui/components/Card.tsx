import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={clsx('rounded-xl border border-app-border bg-app-card', className)}>
      {children}
    </section>
  )
}
