import { AlertTriangle, Copy, X } from 'lucide-react'
import { createPortal } from 'react-dom'

import { SUBSCRIPTION_LOGIN } from '@/constants/subscription-login'
import type { TargetTool } from '@/domain/entities/preset'
import type { SubscriptionSwitchBlockState } from '@/domain/rules/subscription-switch-guard'
import { useCopyCommand } from '@/hooks/use-copy-command'
import { useT } from '@/i18n/index'
import { Button } from '@/ui/components/Button'

const TITLE_ID = 'subscription-login-required-title'
const BODY_ID = 'subscription-login-required-body'

function GuardHeader({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 id={TITLE_ID} className="flex items-center gap-2 text-base font-semibold">
        <AlertTriangle className="h-4 w-4 shrink-0 text-app-warn-text" aria-hidden />
        {t('subscription.guardTitle')}
      </h2>
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="rounded-md p-1 text-app-muted transition-colors hover:bg-app-hover hover:text-app"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

function LoginCommand({ command }: { command: string }) {
  const t = useT()
  const { copied, copy } = useCopyCommand(command)
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-app-border bg-app-sunken px-3 py-2">
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-app">{command}</code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1 text-xs text-app-accent transition-colors hover:text-app"
      >
        <Copy className="h-3 w-3" aria-hidden />
        {t(copied ? 'subscription.copied' : 'subscription.copy')}
      </button>
    </div>
  )
}

function GuardActions({
  pending,
  onRetry,
  onClose,
}: {
  pending: boolean
  onRetry: () => void
  onClose: () => void
}) {
  const t = useT()
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>
        {t('common.cancel')}
      </Button>
      <Button disabled={pending} onClick={onRetry}>
        {pending ? t('presetRow.applying') : t('subscription.guardRetry')}
      </Button>
    </div>
  )
}

/** 未登录时切换 Codex 官方订阅的阻断弹窗：给出原因、登录命令与原地重试入口 */
export function SubscriptionLoginRequiredDialog({
  tool,
  state,
  pending,
  onRetry,
  onClose,
}: {
  tool: TargetTool
  state: SubscriptionSwitchBlockState
  pending: boolean
  onRetry: () => void
  onClose: () => void
}) {
  const t = useT()
  const guide = SUBSCRIPTION_LOGIN[tool]
  return createPortal(
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      aria-describedby={BODY_ID}
    >
      <div className="animate-dialog-in w-full max-w-md rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl">
        <GuardHeader onClose={onClose} />
        <p id={BODY_ID} className="mt-3 text-sm leading-relaxed text-app-muted">
          {t(state === 'unknown' ? 'subscription.guardUnknown' : 'subscription.guardLoggedOut')}
        </p>
        <LoginCommand command={guide.command} />
        <GuardActions pending={pending} onRetry={onRetry} onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}
