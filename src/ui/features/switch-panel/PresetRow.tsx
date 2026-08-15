import clsx from 'clsx'
import { CheckCircle2 } from 'lucide-react'

import type { ConnectivityResult, ConnectivityStatus } from '@/domain/entities/connectivity'
import type { Preset } from '@/domain/entities/preset'
import { useIsPresetActive } from '@/hooks/use-active-preset'
import { useConnectivityTest } from '@/hooks/use-connectivity-test'
import { maskApiKey } from '@/utils/mask'
import { Badge } from '@/ui/components/Badge'
import { PresetRowActions } from './PresetRowActions'

const STATUS_CLASS: Record<ConnectivityStatus, string> = {
  ok: 'text-app-ok-text',
  'invalid-key': 'text-app-danger-text',
  unreachable: 'text-app-warn-text',
  unsupported: 'text-app-faint',
}

function connectivityText(result: ConnectivityResult): string {
  if (result.status === 'ok') {
    return `连通正常（${String(result.latencyMs ?? '-')}ms）`
  }
  if (result.status === 'invalid-key') {
    return 'API Key 无效或无权限'
  }
  if (result.status === 'unreachable') {
    return '无法连通'
  }
  return '该供应商不支持探测，请直接切换验证'
}

export function PresetRow({
  preset,
  onEdit,
}: {
  preset: Preset
  onEdit: (preset: Preset) => void
}) {
  const test = useConnectivityTest()
  const isActive = useIsPresetActive(preset)

  return (
    <li
      className={clsx(
        'animate-fade-in rounded-lg border p-3 transition-colors duration-150',
        isActive
          ? 'border-app-accent/60 bg-app-accent-soft/60 shadow-sm shadow-app-accent/10'
          : 'border-app-border bg-app-sunken hover:border-app-accent/40 hover:bg-app-hover'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{preset.name}</span>
            <Badge>{preset.providerName}</Badge>
            {isActive ? (
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                当前
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 truncate font-mono text-xs text-app-muted">{preset.model}</p>
          <p className="mt-0.5 font-mono text-[11px] text-app-faint">{maskApiKey(preset.apiKey)}</p>
          {test.data ? (
            <p className={clsx('mt-1 text-[11px]', STATUS_CLASS[test.data.status])}>
              {connectivityText(test.data)}
            </p>
          ) : null}
        </div>
        <PresetRowActions
          preset={preset}
          testPending={test.isPending}
          onTest={() => {
            test.mutate(preset)
          }}
          onEdit={onEdit}
        />
      </div>
    </li>
  )
}
