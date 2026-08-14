import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { presetService } from '@/app/composition'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { PresetInput } from '@/domain/entities/preset'

export function usePresets() {
  return useQuery({ queryKey: QUERY_KEYS.presets, queryFn: () => presetService.list() })
}

export function useCreatePreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PresetInput) => presetService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.presets })
    },
  })
}

export function useUpdatePreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: PresetInput }) =>
      presetService.update(args.id, args.input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.presets })
    },
  })
}

export function useRemovePreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => presetService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.presets })
    },
  })
}
