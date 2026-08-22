import { Trash2 } from 'lucide-react'

import { useConfirmAction } from '@/hooks/use-confirm-action'
import { useT } from '@/i18n/index'
import { Button } from '@/ui/components/Button'

export function ProjectRemoveButton({
  disabled,
  pending,
  onRemove,
}: {
  disabled: boolean
  pending: boolean
  onRemove: () => void
}) {
  const t = useT()
  const remove = useConfirmAction(onRemove)
  return (
    <Button
      size="md"
      variant="danger"
      disabled={disabled || pending}
      onClick={remove.trigger}
      aria-label={remove.confirming ? t('project.confirmRemove') : t('project.remove')}
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      {pending ? t('project.removing') : remove.confirming ? t('project.confirmRemove') : t('project.remove')}
    </Button>
  )
}
