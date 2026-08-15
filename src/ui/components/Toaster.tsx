import clsx from 'clsx'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { useToastStore } from '@/stores/toast-store'

/** UI 统一反馈出口（CODING_STANDARDS §6：UI 层统一拦截） */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)
  if (toasts.length === 0) {
    return null
  }
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          onClick={() => {
            dismiss(toast.id)
          }}
          className={clsx(
            'animate-toast-in flex cursor-pointer items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur',
            toast.kind === 'success'
              ? 'border-app-ok-border bg-app-ok-bg/95 text-app-ok-text'
              : 'border-app-danger-border bg-app-danger-bg/95 text-app-danger-text'
          )}
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <span className="min-w-0">{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
