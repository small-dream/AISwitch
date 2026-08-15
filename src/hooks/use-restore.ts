import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { restoreService } from '@/app/composition'
import { QUERY_KEYS } from '@/constants/query-keys'

/** 一键还原计划（弹窗预览用；只读不写） */
export function useRestorePlan(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.restorePlan,
    queryFn: () => restoreService.plan(),
    enabled,
  })
}

/** 执行一键还原；成功后刷新工具状态 / 备份 / 计划缓存 */
export function useExecuteRestore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => restoreService.execute(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.toolStatus })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.restorePlan })
      // 备份键前缀（use-backups 的 ['backups', tool] 家族）
      void queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
  })
}
