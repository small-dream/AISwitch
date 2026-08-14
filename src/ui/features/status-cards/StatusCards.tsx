import { useRollback } from '@/hooks/use-switch'
import { useToolStatus } from '@/hooks/use-tool-status'
import { TOOL_META } from '@/constants/tools'
import type { TargetTool, ToolInstallStatus, ToolStatus } from '@/domain/entities/preset'
import { errorMessage } from '@/utils/error-message'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { StatusDot } from '@/ui/components/StatusDot'

const STATUS_TEXT: Record<ToolInstallStatus, string> = {
  installed: '已配置',
  'not-configured': '未检测到配置',
  unknown: '状态未知',
}

export function StatusCards() {
  const { data: statuses, isLoading } = useToolStatus()
  const rollback = useRollback()

  if (isLoading) {
    return <Card className="p-6 text-sm text-zinc-400">正在探测本机 Claude Code / Codex 环境…</Card>
  }

  const handleRollback = (tool: TargetTool) => {
    rollback.mutate(tool, {
      onSuccess: (restored) => {
        if (restored) {
          toastSuccess(`已恢复 ${TOOL_META[tool].label} 最近一份备份`)
        } else {
          toastError('没有可用备份')
        }
      },
      onError: (error) => {
        toastError(errorMessage(error))
      },
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {(statuses ?? []).map((status) => (
        <ToolStatusCard
          key={status.tool}
          status={status}
          rollbackPending={rollback.isPending}
          onRollback={handleRollback}
        />
      ))}
    </div>
  )
}

function ToolStatusCard({
  status,
  rollbackPending,
  onRollback,
}: {
  status: ToolStatus
  rollbackPending: boolean
  onRollback: (tool: TargetTool) => void
}) {
  const meta = TOOL_META[status.tool]
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={status.status} />
          <span className="font-medium">{meta.label}</span>
        </div>
        <span className="text-xs text-zinc-500">{STATUS_TEXT[status.status]}</span>
      </div>
      <div className="mt-3 space-y-1">
        <p className="truncate font-mono text-xs text-zinc-300">{status.activeModel ?? '—'}</p>
        <p className="truncate text-xs text-zinc-500">
          {status.activeProviderName ?? meta.configPath}
        </p>
        {status.status === 'not-configured' ? (
          <p className="text-[11px] leading-4 text-zinc-600">
            首次切换将自动创建全局配置，VS Code 插件方式使用同样生效
          </p>
        ) : null}
      </div>
      {status.status !== 'not-configured' ? (
        <div className="mt-3">
          <Button
            size="sm"
            variant="secondary"
            disabled={rollbackPending}
            onClick={() => {
              onRollback(status.tool)
            }}
          >
            恢复上次备份
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
