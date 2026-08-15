import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-app-border-strong bg-app-sunken/50 py-12 text-center">
      {icon ? <div className="text-app-faint">{icon}</div> : null}
      <p className="text-sm font-medium text-app">{title}</p>
      {description ? (
        <p className="max-w-xs text-xs leading-5 text-app-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  )
}
