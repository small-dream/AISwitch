import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { bundleService } from '@/app/composition'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { BundleInput } from '@/domain/entities/bundle'

export function useBundles() {
  return useQuery({ queryKey: QUERY_KEYS.bundles, queryFn: () => bundleService.list() })
}

export function useCreateBundle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BundleInput) => bundleService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundles })
    },
  })
}

export function useUpdateBundle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: BundleInput }) =>
      bundleService.update(args.id, args.input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundles })
    },
  })
}

export function useRemoveBundle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bundleService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bundles })
    },
  })
}

export function useSwitchBundle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bundleId: string) => bundleService.switch(bundleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.toolStatus })
    },
  })
}
