import clsx from 'clsx'

import type { ToolInstallStatus } from '@/domain/entities/preset'

const COLOR_BY_STATUS: Record<ToolInstallStatus, string> = {
  installed: 'bg-emerald-500',
  'not-configured': 'bg-zinc-500',
  unknown: 'bg-amber-500',
}

export function StatusDot({ status }: { status: ToolInstallStatus }) {
  return (
    <span
      className={clsx('h-2 w-2 shrink-0 rounded-full', COLOR_BY_STATUS[status])}
      aria-label={status}
    />
  )
}
