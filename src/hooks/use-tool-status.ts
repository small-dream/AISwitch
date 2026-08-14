import { useQuery } from '@tanstack/react-query'

import { QUERY_KEYS } from '@/constants/query-keys'
import { detectAllTools } from '@/services/detect-service'

export function useToolStatus() {
  return useQuery({ queryKey: QUERY_KEYS.toolStatus, queryFn: () => detectAllTools() })
}
