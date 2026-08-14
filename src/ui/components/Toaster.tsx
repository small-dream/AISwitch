import clsx from 'clsx'

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
            'cursor-pointer rounded-lg border px-4 py-3 text-sm shadow-lg',
            toast.kind === 'success'
              ? 'border-emerald-700 bg-emerald-950/95 text-emerald-200'
              : 'border-red-800 bg-red-950/95 text-red-200'
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
