import type { ToolInstallStatus, ToolStatus } from '@/domain/entities/preset'
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

export function StatusCards() {
  const { data: statuses, isLoading } = useToolStatus()
  const { data: presence } = useVscodePresence()

  if (isLoading) {
    return (
      <Card className="p-6 text-sm text-app-muted">正在探测本机 Claude Code / Codex 环境…</Card>
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
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={status.status} />
          <span className="font-medium">{meta.label}</span>
        </div>
        <span className="text-xs text-app-muted">{STATUS_TEXT[status.status]}</span>
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
