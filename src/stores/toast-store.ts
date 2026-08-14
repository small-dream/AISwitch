import { create } from 'zustand'

export type ToastKind = 'success' | 'error'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (kind: ToastKind, message: string) => void
  dismiss: (id: number) => void
}

const AUTO_DISMISS_MS = 4000
let nextToastId = 1

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextToastId++
    set((state) => ({ toasts: [...state.toasts, { id, kind, message }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
    }, AUTO_DISMISS_MS)
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
}))

export function toastSuccess(message: string): void {
  useToastStore.getState().push('success', message)
}

export function toastError(message: string): void {
  useToastStore.getState().push('error', message)
}
