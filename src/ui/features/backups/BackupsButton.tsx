import { useState } from 'react'

import type { TargetTool } from '@/domain/entities/preset'
import { Button } from '@/ui/components/Button'
import { BackupsDialog } from './BackupsDialog'

/** 备份管理入口（US-10）：打开所属工具的备份弹窗 */
export function BackupsButton({ tool }: { tool: TargetTool }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setOpen(true)
        }}
      >
        备份管理
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
