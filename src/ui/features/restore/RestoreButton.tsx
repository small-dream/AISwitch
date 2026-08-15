import { RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { useT } from '@/i18n/index'

import { RestoreDialog } from './RestoreDialog'

/** 一键还原入口（US-一键还原）：顶栏危险操作图标按钮，打开三步确认弹窗 */
export function RestoreButton() {
  const [open, setOpen] = useState(false)
  const t = useT()
  return (
    <>
      <button
        type="button"
        aria-label={t('restore.buttonTitle')}
        title={t('restore.buttonTitle')}
        onClick={() => {
          setOpen(true)
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-app-border bg-app-card text-app-muted transition-all duration-150 hover:border-app-danger-border hover:text-app-danger-text active:scale-95"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      {open ? (
        <RestoreDialog
          onClose={() => {
            setOpen(false)
          }}
        />
      ) : null}
    </>
  )
}
