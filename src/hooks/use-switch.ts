import { useMutation, useQueryClient } from '@tanstack/react-query'

import { switchService } from '@/app/composition'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { TargetTool } from '@/domain/entities/preset'

export function useSwitchPreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { tool: TargetTool; presetId: string }) =>
      switchService.switch(args.tool, args.presetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.toolStatus })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.backups })
      // 订阅条目切换后登录态提示需重新探测（可能刚在终端完成登录）
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscriptionAuthRoot })
    },
  })
}

/** 官方订阅条目（PRD §5.13）：清空该工具的全部托管键，交回 CLI 登录态与模型选择 */
export function useClearManaged() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tool: TargetTool) => switchService.clearManaged(tool),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.toolStatus })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.backups })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscriptionAuthRoot })
    },
  })
}

export function useRollback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tool: TargetTool) => switchService.rollback(tool),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.toolStatus })
    },
  })
}
