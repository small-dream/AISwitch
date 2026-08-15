import { useState } from 'react'

import type { TargetTool } from '@/domain/entities/preset'
import { useT } from '@/i18n/index'
import { Button } from '@/ui/components/Button'
import { BackupsDialog } from './BackupsDialog'

/** 备份管理入口（US-10）：打开所属工具的备份弹窗 */
export function BackupsButton({ tool }: { tool: TargetTool }) {
  const [open, setOpen] = useState(false)
  const t = useT()
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setOpen(true)
        }}
      >
        {t('backups.manage')}
      </Button>
      {open ? (
        <BackupsDialog
          tool={tool}
          onClose={() => {
            setOpen(false)
          }}
        />
      ) : null}
    </>
  )
}
