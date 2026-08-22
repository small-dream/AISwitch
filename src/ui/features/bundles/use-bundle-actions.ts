import type { Bundle } from '@/domain/entities/bundle'
import { TOOL_META } from '@/constants/tools'
import { useRemoveBundle, useSwitchBundle } from '@/hooks/use-bundles'
import { useT } from '@/i18n/index'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'

/** 组合面板的切换 / 删除动作：逐工具结果反馈（US-17） */
export function useBundleActions() {
  const t = useT()
  const switchBundle = useSwitchBundle()
  const removeBundle = useRemoveBundle()

  const handleSwitch = (bundle: Bundle) => {
    switchBundle.mutate(bundle.id, {
      onSuccess: (results) => {
        const failed = results.filter((result) => !result.ok)
        if (failed.length === 0) {
          toastSuccess(
            t('bundle.switchedAll', { name: bundle.name, count: String(results.length) })
          )
          return
        }
        for (const result of failed) {
          const detail = result.error ? `：${result.error}` : ''
          toastError(`${t('bundle.switchFailed', { tool: TOOL_META[result.tool].label })}${detail}`)
        }
      },
      onError: (error) => {
        toastError(errorMessage(error))
      },
    })
  }

  const handleRemove = (bundle: Bundle) => {
    if (!window.confirm(t('bundle.confirmDelete'))) {
      return
    }
    removeBundle.mutate(bundle.id, {
      onSuccess: () => {
        toastSuccess(t('bundle.deleted'))
      },
      onError: (error) => {
        toastError(errorMessage(error))
      },
    })
  }

  return { handleSwitch, handleRemove, switching: switchBundle.isPending }
}
