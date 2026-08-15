import clsx from 'clsx'
import type { ReactNode } from 'react'

type Tone = 'default' | 'success' | 'warning'

const TONE_CLASSES: Record<Tone, string> = {
  default: 'border-app-border bg-app-sunken text-app-muted',
  success: 'border-app-ok-border bg-app-ok-bg text-app-ok-text',
  warning: 'border-app-warn-border bg-app-warn-bg text-app-warn-text',
}

export function Badge({ tone = 'default', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        TONE_CLASSES[tone]
      )}
    >
      {children}
    </span>
  )
}
