import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { backupService } from '@/app/composition'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { TargetTool } from '@/domain/entities/preset'
import type { BackupEntry } from '@/services/backup-service'

function backupsKey(tool: TargetTool) {
  return ['backups', tool] as const
}

export function useBackups(tool: TargetTool) {
  return useQuery({ queryKey: backupsKey(tool), queryFn: () => backupService.list(tool) })
}

export function useRestoreBackup(tool: TargetTool) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entry: BackupEntry) => backupService.restore(entry),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: backupsKey(tool) })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.toolStatus })
    },
  })
}

export function useRemoveBackup(tool: TargetTool) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => backupService.remove(tool, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: backupsKey(tool) })
    },
  })
}
