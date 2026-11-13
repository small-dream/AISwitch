import type { TargetTool } from '@/domain/entities/preset'
import type { SubscriptionSwitchGate } from '@/hooks/use-subscription-switch-guard'
import { SubscriptionConflictDialog } from './SubscriptionConflictDialog'
import { SubscriptionLoginRequiredDialog } from './SubscriptionLoginRequiredDialog'
import { SubscriptionSuccessGuideDialog } from './SubscriptionSuccessGuideDialog'

/** 订阅切换后的三类引导统一挂载点，避免行组件堆叠弹窗分支 */
export function SubscriptionGuides({
  tool,
  gate,
  successGuide,
  pending,
  loginCommand,
  onRetry,
  onConfirmConflict,
  onClose,
  onCloseSuccess,
}: {
  tool: TargetTool
  gate: SubscriptionSwitchGate | null
  successGuide: boolean
  pending: boolean
  loginCommand?: string
  onRetry: () => void
  onConfirmConflict: () => void
  onClose: () => void
  onCloseSuccess: () => void
}) {
  return (
    <>
      {gate?.kind === 'login' ? (
        <SubscriptionLoginRequiredDialog
          tool={tool}
          state={gate.state}
          pending={pending}
          command={loginCommand}
          onRetry={onRetry}
          onClose={onClose}
        />
      ) : null}
      {gate?.kind === 'conflict' ? (
        <SubscriptionConflictDialog
          pending={pending}
          onConfirm={onConfirmConflict}
          onClose={onClose}
        />
      ) : null}
      {successGuide ? (
        <SubscriptionSuccessGuideDialog command={loginCommand} onClose={onCloseSuccess} />
      ) : null}
    </>
  )
}
