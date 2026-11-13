import type { TargetTool } from '@/domain/entities/preset'
import type { SubscriptionSwitchGate } from '@/hooks/use-subscription-switch-guard'
import { SubscriptionConflictDialog } from './SubscriptionConflictDialog'
import { SubscriptionLoginRequiredDialog } from './SubscriptionLoginRequiredDialog'
import { SubscriptionSuccessGuideDialog } from './SubscriptionSuccessGuideDialog'

function SubscriptionGate({
  tool,
  gate,
  pending,
  startingLogin,
  loginCommand,
  onRetry,
  onStartLogin,
  onConfirmConflict,
  onClose,
}: {
  tool: TargetTool
  gate: SubscriptionSwitchGate | null
  pending: boolean
  startingLogin?: boolean
  loginCommand?: string
  onRetry: () => void
  onStartLogin?: () => void
  onConfirmConflict: () => void
  onClose: () => void
}) {
  if (gate?.kind === 'login') {
    return (
      <SubscriptionLoginRequiredDialog
        tool={tool}
        state={gate.state}
        pending={pending}
        startingLogin={startingLogin}
        command={loginCommand}
        onRetry={onRetry}
        onStartLogin={onStartLogin}
        onClose={onClose}
      />
    )
  }
  if (gate?.kind === 'conflict') {
    return (
      <SubscriptionConflictDialog
        pending={pending}
        onConfirm={onConfirmConflict}
        onClose={onClose}
      />
    )
  }
  return null
}

/** 订阅切换后的三类引导统一挂载点，避免行组件堆叠弹窗分支 */
export function SubscriptionGuides({
  tool,
  gate,
  successGuide,
  pending,
  startingLogin,
  loginCommand,
  onRetry,
  onStartLogin,
  onConfirmConflict,
  onClose,
  onCloseSuccess,
}: {
  tool: TargetTool
  gate: SubscriptionSwitchGate | null
  successGuide: boolean
  pending: boolean
  startingLogin?: boolean
  loginCommand?: string
  onRetry: () => void
  onStartLogin?: () => void
  onConfirmConflict: () => void
  onClose: () => void
  onCloseSuccess: () => void
}) {
  return (
    <>
      <SubscriptionGate
        tool={tool}
        gate={gate}
        pending={pending}
        startingLogin={startingLogin}
        loginCommand={loginCommand}
        onRetry={onRetry}
        onStartLogin={onStartLogin}
        onConfirmConflict={onConfirmConflict}
        onClose={onClose}
      />
      {successGuide ? (
        <SubscriptionSuccessGuideDialog
          command={loginCommand}
          startingLogin={startingLogin}
          onStartLogin={onStartLogin}
          onClose={onCloseSuccess}
        />
      ) : null}
    </>
  )
}
