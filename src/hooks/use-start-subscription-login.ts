import { useCallback, useState } from 'react'

import { subscriptionAuthService } from '@/app/composition'
import type { TargetTool } from '@/domain/entities/preset'
import { useT } from '@/i18n/index'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'

/** 直接启动 CLI 登录（Codex 会打开浏览器）；完成授权后由登录态查询自行重查 */
export function useStartSubscriptionLogin(tool: TargetTool) {
  const t = useT()
  const [isPending, setIsPending] = useState(false)
  const runLogin = useCallback(async () => {
    setIsPending(true)
    try {
      await subscriptionAuthService.startLogin(tool)
      toastSuccess(t('subscription.loginStarted'))
    } catch (error) {
      toastError(errorMessage(error))
    } finally {
      setIsPending(false)
    }
  }, [t, tool])
  const startLogin = useCallback(() => {
    void runLogin()
  }, [runLogin])
  return { isPending, startLogin }
}
