import { useMutation, useQuery } from '@tanstack/react-query'

import { updateService } from '@/app/composition'
import { UPDATE_CHECK_STALE_TIME_MS, UPDATE_QUERY_KEY } from '@/constants/update'
import { useT } from '@/i18n/index'
import { toastError, toastSuccess } from '@/stores/toast-store'

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
  const check = () => {
    void query.refetch().then((result) => {
      if (result.error) {
        toastError(t('update.checkFailed'))
        return
      }
      if (!result.data) {
        toastSuccess(t('update.latest'))
      }
    })
  }
  return {
    update: query.data ?? null,
    canCheck: updateService.canCheck(),
    isChecking: query.isFetching,
    isInstalling: install.isPending,
    check,
    install: install.mutate,
  }
}
