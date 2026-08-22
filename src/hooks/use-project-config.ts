import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectConfigService } from '@/app/composition'
import type { TargetTool } from '@/domain/entities/preset'

export const PROJECT_CONFIG_RECORDS_QUERY_KEY = ['project-config-records'] as const

export function useProjectConfigRecords(tool: TargetTool) {
  return useQuery({
    queryKey: [...PROJECT_CONFIG_RECORDS_QUERY_KEY, tool],
    queryFn: () => projectConfigService.listRecords(tool),
  })
}

export function useProjectConfig(projectPath: string, tool: TargetTool) {
  return useQuery({
    queryKey: ['project-status', projectPath, tool],
    queryFn: () => projectConfigService.detect(projectPath, tool),
    enabled: projectPath.trim() !== '',
  })
}

export function useApplyProjectConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { projectPath: string; tool: TargetTool; presetId: string }) =>
      projectConfigService.apply(args.projectPath, args.tool, args.presetId),
    onSuccess: (_result, args) => {
      void queryClient.invalidateQueries({ queryKey: ['project-status', args.projectPath, args.tool] })
      void queryClient.invalidateQueries({ queryKey: [...PROJECT_CONFIG_RECORDS_QUERY_KEY, args.tool] })
    },
  })
}

export function useRemoveProjectConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { projectPath: string; tool: TargetTool }) =>
      projectConfigService.remove(args.projectPath, args.tool),
    onSuccess: (_result, args) => {
      void queryClient.invalidateQueries({ queryKey: ['project-status', args.projectPath, args.tool] })
      void queryClient.invalidateQueries({ queryKey: [...PROJECT_CONFIG_RECORDS_QUERY_KEY, args.tool] })
    },
  })
}
