import { CheckCircle2, Copy, ExternalLink, X } from 'lucide-react'
import { createPortal } from 'react-dom'

import { buildCodexLoginCommand } from '@/domain/rules/subscription-login-command'
import { useCopyCommand } from '@/hooks/use-copy-command'
import { useT } from '@/i18n/index'
import { Button } from '@/ui/components/Button'

const TITLE_ID = 'subscription-success-title'
const BODY_ID = 'subscription-success-body'

function SuccessHeader({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 id={TITLE_ID} className="flex items-center gap-2 text-base font-semibold">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-app-ok-text" aria-hidden />
        {t('subscription.successTitle')}
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

function SuccessActions({
  startingLogin,
  onStartLogin,
  onClose,
}: {
  startingLogin?: boolean
  onStartLogin?: () => void
  onClose: () => void
}) {
  const t = useT()
  return (
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      <Button variant={onStartLogin ? 'secondary' : 'primary'} onClick={onClose}>
        {t('common.close')}
      </Button>
      {onStartLogin ? (
        <Button disabled={startingLogin} onClick={onStartLogin}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          {t(startingLogin ? 'subscription.startingLogin' : 'subscription.startLogin')}
        </Button>
      ) : null}
    </div>
  )
}

/** 切换成功后的可操作引导：仅 Codex 展示，避免瞬时 Toast 来不及登录或复制命令（PRD §5.13） */
export function SubscriptionSuccessGuideDialog({
  command,
  startingLogin,
  onStartLogin,
  onClose,
}: {
  command?: string
  startingLogin?: boolean
  onStartLogin?: () => void
  onClose: () => void
}) {
  const t = useT()
  const loginCommand = command ?? buildCodexLoginCommand()
  const { copied, copy } = useCopyCommand(loginCommand)
  return createPortal(
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      aria-describedby={BODY_ID}
    >
      <div className="animate-dialog-in w-full max-w-md rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl">
        <SuccessHeader onClose={onClose} />
        <p id={BODY_ID} className="mt-3 text-sm leading-relaxed text-app-muted">
          {t('subscription.successBody')}
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-app-border bg-app-sunken px-3 py-2">
          <code title={loginCommand} className="min-w-0 flex-1 truncate font-mono text-xs text-app">
            {loginCommand}
          </code>
          <button
            type="button"
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-app-accent transition-colors hover:text-app"
          >
            <Copy className="h-3 w-3" aria-hidden />
            {t(copied ? 'subscription.copied' : 'subscription.copy')}
          </button>
        </div>
        <SuccessActions
          startingLogin={startingLogin}
          onStartLogin={onStartLogin}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body
  )
}
