import { AlertTriangle, X } from 'lucide-react'
import { createPortal } from 'react-dom'

import { useT } from '@/i18n/index'
import { Button } from '@/ui/components/Button'

const TITLE_ID = 'subscription-conflict-title'
const BODY_ID = 'subscription-conflict-body'

function ConflictHeader({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 id={TITLE_ID} className="flex items-center gap-2 text-base font-semibold">
        <AlertTriangle className="h-4 w-4 shrink-0 text-app-warn-text" aria-hidden />
        {t('subscription.conflictTitle')}
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

function ConflictActions({
  pending,
  onConfirm,
  onClose,
}: {
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const t = useT()
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>
        {t('common.cancel')}
      </Button>
      <Button disabled={pending} onClick={onConfirm}>
        {pending ? t('presetRow.applying') : t('subscription.conflictRemove')}
      </Button>
    </div>
  )
}

/** 用户配置强制 API 登录时，明确询问后才移除该字段（PRD §5.13） */
export function SubscriptionConflictDialog({
  pending,
  onConfirm,
  onClose,
}: {
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const t = useT()
  return createPortal(
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      aria-describedby={BODY_ID}
    >
      <div className="animate-dialog-in w-full max-w-md rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl">
        <ConflictHeader onClose={onClose} />
        <p id={BODY_ID} className="mt-3 text-sm leading-relaxed text-app-muted">
          {t('subscription.conflictBody')}
        </p>
        <code className="mt-3 block rounded-lg border border-app-border bg-app-sunken px-3 py-2 font-mono text-xs text-app">
          forced_login_method = &quot;api&quot;
        </code>
        <ConflictActions pending={pending} onConfirm={onConfirm} onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}
