import { useQuery } from '@tanstack/react-query'

import { vscodePresenceService } from '@/app/composition'

/** VS Code 插件安装迹象（US-14）：仅用于提示增强 */
export function useVscodePresence() {
  return useQuery({
    queryKey: ['vscode-presence'],
    queryFn: () => vscodePresenceService.detect(),
    staleTime: 60_000,
  })
}
