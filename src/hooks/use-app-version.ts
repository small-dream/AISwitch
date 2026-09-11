import { useQuery } from '@tanstack/react-query'

import { getAppVersion } from '@/adapters/system/app-meta'
import { QUERY_KEYS } from '@/constants/query-keys'

/** 应用版本号：进程生命周期内不变（staleTime: Infinity）；失败或非桌面运行时返回空串，UI 静默隐藏 */
export function useAppVersion(): string {
  const query = useQuery({
    queryKey: QUERY_KEYS.appVersion,
    queryFn: () => getAppVersion(),
    staleTime: Infinity,
    retry: false,
  })
  return query.data ?? ''
}
