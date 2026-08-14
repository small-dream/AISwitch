import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={clsx('rounded-xl border border-zinc-800 bg-zinc-900/60', className)}>
      {children}
    </section>
  )
}
