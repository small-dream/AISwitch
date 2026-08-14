import clsx from 'clsx'

import type { ToolInstallStatus } from '@/domain/entities/preset'

const COLOR_BY_STATUS: Record<ToolInstallStatus, string> = {
  installed: 'bg-emerald-400',
  'not-configured': 'bg-zinc-600',
  unknown: 'bg-amber-400',
}

export function StatusDot({ status }: { status: ToolInstallStatus }) {
  return (
    <span
      className={clsx('h-2 w-2 shrink-0 rounded-full', COLOR_BY_STATUS[status])}
      aria-label={status}
    />
  )
}
