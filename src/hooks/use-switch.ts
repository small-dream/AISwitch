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
