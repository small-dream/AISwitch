import { useState } from 'react'

import type { TargetTool } from '@/domain/entities/preset'
import { isAppError } from '@/domain/errors'
import type { SubscriptionSwitchBlockState } from '@/domain/rules/subscription-switch-guard'
import { useT } from '@/i18n/index'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'
import { useClearManaged } from '@/hooks/use-switch'

/** 从服务层错误中取出守卫状态；不是登录拦截错误则返回 null */
export function loginBlockState(error: unknown): SubscriptionSwitchBlockState | null {
  if (!isAppError(error) || error.code !== 'E_SUBSCRIPTION_LOGIN_REQUIRED') {
    return null
  }
  return error.context.state === 'unknown' ? 'unknown' : 'logged-out'
}

/**
 * 官方订阅切换的 UI 守卫：服务层拒绝切换时打开登录引导，而不是只弹一条错误提示。
 * 用户完成 codex login 后可原地重试，无需重新寻找入口。
 */
export function useSubscriptionSwitchGuard(tool: TargetTool) {
  const t = useT()
  const mutation = useClearManaged()
  const [gate, setGate] = useState<SubscriptionSwitchBlockState | null>(null)

  const apply = () => {
    mutation.mutate(tool, {
      onSuccess: () => {
        setGate(null)
        toastSuccess(t('presetRow.switchedTo', { name: t('subscriptionPreset.name') }))
      },
      onError: (error) => {
        const state = loginBlockState(error)
        if (state) {
          setGate(state)
          return
        }
        toastError(errorMessage(error))
      },
    })
  }

  return {
    gate,
    pending: mutation.isPending,
    apply,
    retry: apply,
    close: () => {
      setGate(null)
    },
  }
}
