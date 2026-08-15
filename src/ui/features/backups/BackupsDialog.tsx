import { History } from 'lucide-react'

import type { TargetTool } from '@/domain/entities/preset'
import { useBackups, useRemoveBackup, useRestoreBackup } from '@/hooks/use-backups'
import { useRollback } from '@/hooks/use-switch'
import { TOOL_META } from '@/constants/tools'
import { useT } from '@/i18n/index'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'
import { Button } from '@/ui/components/Button'
import type { BackupEntry } from '@/services/backup-service'

function formatTimestamp(timestamp: string): string {
  return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)} ${timestamp.slice(9, 11)}:${timestamp.slice(11, 13)}:${timestamp.slice(13, 15)}`
}

function BackupRow({ entry, tool }: { entry: BackupEntry; tool: TargetTool }) {
  const restore = useRestoreBackup(tool)
  const remove = useRemoveBackup(tool)
  const t = useT()
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-app-border bg-app-sunken px-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-mono text-xs text-app">{entry.basename}</p>
        <p className="text-[11px] text-app-muted">{formatTimestamp(entry.timestamp)}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          disabled={restore.isPending}
          onClick={() => {
            restore.mutate(entry, {
              onSuccess: () => {
                toastSuccess(t('backups.restoredEntry', { name: entry.basename }))
              },
              onError: (error) => {
                toastError(errorMessage(error))
              },
            })
          }}
        >
          {t('common.restore')}
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={remove.isPending}
          onClick={() => {
            remove.mutate(entry.name)
          }}
        >
          {t('common.delete')}
        </Button>
      </div>
    </li>
  )
}

/** 备份历史管理弹窗（US-10）：恢复最近一份 + 按条目恢复/删除 */
export function BackupsDialog({ tool, onClose }: { tool: TargetTool; onClose: () => void }) {
  const { data: entries, isLoading } = useBackups(tool)
  const rollback = useRollback()
  const t = useT()
  const list = entries ?? []

  const handleRollbackLatest = () => {
    rollback.mutate(tool, {
      onSuccess: (restored) => {
        if (restored) {
          toastSuccess(t('backups.restoredLatest'))
        } else {
          toastError(t('backups.noneAvailable'))
        }
      },
      onError: (error) => {
        toastError(errorMessage(error))
      },
    })
  }

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-dialog-in flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <History className="h-4 w-4 text-app-accent" aria-hidden />
            {TOOL_META[tool].label} · {t('backups.manage')}
          </h2>
          <Button size="sm" variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
        <div className="mb-3">
          <Button
            size="sm"
            disabled={rollback.isPending || list.length === 0}
            onClick={handleRollbackLatest}
          >
            {t('backups.restoreLatest')}
          </Button>
        </div>
        <BackupList tool={tool} entries={list} isLoading={isLoading} />
      </div>
    </div>
  )
}

function BackupList({
  tool,
  entries,
  isLoading,
}: {
  tool: TargetTool
  entries: BackupEntry[]
  isLoading: boolean
}) {
  const t = useT()
  if (isLoading) {
    return <p className="py-6 text-center text-sm text-app-muted">{t('common.loading')}</p>
  }
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-app-muted">{t('backups.empty')}</p>
  }
  return (
    <ul className="flex-1 space-y-2 overflow-y-auto">
      {entries.map((entry) => (
        <BackupRow key={entry.name} entry={entry} tool={tool} />
      ))}
    </ul>
  )
}
