import { useMutation, useQuery } from '@tanstack/react-query'

import { updateService } from '@/app/composition'
import { UPDATE_CHECK_STALE_TIME_MS, UPDATE_QUERY_KEY } from '@/constants/update'
import { useT } from '@/i18n/index'
import { toastError } from '@/stores/toast-store'

/** 启动后检查并预下载更新；只把已完成下载的版本交给顶栏。 */
export function useAppUpdate() {
  const t = useT()
  const query = useQuery({
    queryKey: UPDATE_QUERY_KEY,
    queryFn: () => updateService.prepare(),
    enabled: updateService.canCheck(),
    staleTime: UPDATE_CHECK_STALE_TIME_MS,
    retry: false,
  })
  const install = useMutation({
    mutationFn: () => updateService.install(),
    onError: () => {
      toastError(t('update.installFailed'))
    },
  })
  return {
    update: query.data ?? null,
    isChecking: query.isPending,
    isInstalling: install.isPending,
    install: install.mutate,
  }
}
