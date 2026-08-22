import { useState } from 'react'

import type { Bundle } from '@/domain/entities/bundle'

export interface BundleDialogState {
  open: boolean
  editing: Bundle | null
}

/** 组合弹窗开关状态：新建 / 编辑 / 关闭 */
export function useBundleDialog() {
  const [dialog, setDialog] = useState<BundleDialogState>({ open: false, editing: null })
  const openCreate = () => {
    setDialog({ open: true, editing: null })
  }
  const openEdit = (bundle: Bundle) => {
    setDialog({ open: true, editing: bundle })
  }
  const close = () => {
    setDialog({ open: false, editing: null })
  }
  return { dialog, openCreate, openEdit, close }
}
