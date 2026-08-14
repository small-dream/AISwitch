import clsx from 'clsx'
import type { ReactNode } from 'react'

type Tone = 'default' | 'success' | 'warning'

const TONE_CLASSES: Record<Tone, string> = {
  default: 'border-zinc-700 bg-zinc-800/60 text-zinc-300',
  success: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  warning: 'border-amber-800 bg-amber-950/60 text-amber-300',
}

export function Badge({ tone = 'default', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] leading-none',
        TONE_CLASSES[tone]
      )}
    >
      {children}
    </span>
  )
}
