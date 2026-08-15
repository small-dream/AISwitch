import { Bot, Terminal } from 'lucide-react'
import type { ComponentType } from 'react'

import type { TargetTool, ToolInstallStatus, ToolStatus } from '@/domain/entities/preset'
import { TOOL_META } from '@/constants/tools'
import { useToolStatus } from '@/hooks/use-tool-status'
import { useVscodePresence } from '@/hooks/use-vscode-presence'
import { BackupsButton } from '@/ui/features/backups/BackupsButton'
import { Badge } from '@/ui/components/Badge'
import { Card } from '@/ui/components/Card'
import { StatusDot } from '@/ui/components/StatusDot'

const STATUS_TEXT: Record<ToolInstallStatus, string> = {
  installed: '已配置',
  'not-configured': '未检测到配置',
  unknown: '状态未知',
}

const TOOL_ICON: Record<TargetTool, ComponentType<{ className?: string }>> = {
  'claude-code': Bot,
  codex: Terminal,
}

function StatusCardSkeleton() {
  return (
    <Card className="animate-pulse p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-app-hover" />
        <div className="h-4 w-16 rounded bg-app-hover" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-3/4 rounded bg-app-hover" />
        <div className="h-3 w-1/2 rounded bg-app-hover" />
      </div>
    </Card>
  )
}

export function StatusCards() {
  const { data: statuses, isLoading } = useToolStatus()
  const { data: presence } = useVscodePresence()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusCardSkeleton />
        <StatusCardSkeleton />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {(statuses ?? []).map((status) => (
        <ToolStatusCard
          key={status.tool}
          status={status}
          vscodeDetected={presence?.[status.tool] ?? false}
        />
      ))}
    </div>
  )
}

function ToolStatusCard({
  status,
  vscodeDetected,
}: {
  status: ToolStatus
  vscodeDetected: boolean
}) {
  const meta = TOOL_META[status.tool]
  const ToolIcon = TOOL_ICON[status.tool]
  return (
    <Card hoverable className="animate-fade-in p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
            <ToolIcon className="h-4 w-4" aria-hidden />
          </span>
          <span className="truncate font-medium">{meta.label}</span>
          <StatusDot status={status.status} />
        </div>
        <Badge tone={status.status === 'installed' ? 'success' : 'default'}>
          {STATUS_TEXT[status.status]}
        </Badge>
      </div>
      <div className="mt-3 space-y-1">
        <p className="truncate font-mono text-xs text-app">{status.activeModel ?? '—'}</p>
        <p className="truncate text-xs text-app-muted">
          {status.activeProviderName ?? meta.configPath}
        </p>
        {status.status === 'not-configured' ? (
          vscodeDetected ? (
            <Badge tone="success">检测到 VS Code 插件，切换后即可生效</Badge>
          ) : (
            <p className="text-[11px] leading-4 text-app-faint">
              首次切换将自动创建全局配置，VS Code 插件方式使用同样生效
            </p>
          )
        ) : null}
      </div>
      {status.status !== 'not-configured' ? (
        <div className="mt-3">
          <BackupsButton tool={status.tool} />
        </div>
      ) : null}
    </Card>
  )
}
