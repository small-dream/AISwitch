import { useState } from 'react'

import type { TargetTool } from '@/domain/entities/preset'
import { isAppError } from '@/domain/errors'
import type { SubscriptionSwitchBlockState } from '@/domain/rules/subscription-switch-guard'
import { useT } from '@/i18n/index'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'
import { useClearManaged } from '@/hooks/use-switch'

/** 切换订阅时需要在原行展开的后续引导 */
export type SubscriptionSwitchGate =
  { kind: 'login'; state: SubscriptionSwitchBlockState } | { kind: 'conflict' }

/** 从服务层错误中取出守卫状态；不是登录拦截错误则返回 null */
export function loginBlockState(error: unknown): SubscriptionSwitchBlockState | null {
  if (!isAppError(error) || error.code !== 'E_SUBSCRIPTION_LOGIN_REQUIRED') {
    return null
  }
  return error.context.state === 'unknown' ? 'unknown' : 'logged-out'
}

/** 把服务层拦截错误映射为 UI 弹窗；普通错误返回 null */
export function subscriptionGateFromError(error: unknown): SubscriptionSwitchGate | null {
  if (!isAppError(error)) {
    return null
  }
  if (error.code === 'E_SUBSCRIPTION_CONFLICT_REQUIRED') {
    return { kind: 'conflict' }
  }
  const state = loginBlockState(error)
  return state ? { kind: 'login', state } : null
}

/**
 * 官方订阅切换的 UI 守卫：服务层拒绝切换时打开登录引导，而不是只弹一条错误提示。
 * 用户完成 codex login 后可原地重试，无需重新寻找入口。
 */
export function useSubscriptionSwitchGuard(tool: TargetTool) {
  const t = useT()
  const mutation = useClearManaged()
  const [gate, setGate] = useState<SubscriptionSwitchGate | null>(null)
  const [successGuide, setSuccessGuide] = useState(false)

  const apply = (removeConflicts?: boolean) => {
    const shouldRemoveConflicts = removeConflicts === true
    mutation.mutate(
      { tool, options: shouldRemoveConflicts ? { removeConflicts: true } : undefined },
      {
        onSuccess: () => {
          setGate(null)
          setSuccessGuide(tool === 'codex')
          toastSuccess(t('presetRow.switchedTo', { name: t('subscriptionPreset.name') }))
        },
        onError: (error) => {
          const nextGate = subscriptionGateFromError(error)
          if (nextGate) {
            setGate(nextGate)
            return
          }
          toastError(errorMessage(error))
        },
      }
    )
  }

  return {
    gate,
    successGuide,
    pending: mutation.isPending,
    apply,
    retry: apply,
    confirmConflict: () => {
      apply(true)
    },
    close: () => {
      setGate(null)
    },
    closeSuccessGuide: () => {
      setSuccessGuide(false)
    },
  }
}
