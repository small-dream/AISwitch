import { useQuery } from '@tanstack/react-query'

import { subscriptionAuthService } from '@/app/composition'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { TargetTool } from '@/domain/entities/preset'

/** 当前工具的官方订阅登录态（PRD §5.13）：切换预设后由 use-switch 失效重查 */
export function useSubscriptionAuth(tool: TargetTool) {
  return useQuery({
    queryKey: QUERY_KEYS.subscriptionAuth(tool),
    queryFn: () => subscriptionAuthService.status(tool),
    staleTime: 15_000,
  })
}
