import type { Preset } from '@/domain/entities/preset'
import { useConfirmAction } from '@/hooks/use-confirm-action'
import { useRemovePreset } from '@/hooks/use-presets'
import { useSwitchPreset } from '@/hooks/use-switch'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'
import { Button } from '@/ui/components/Button'

function useRemoveAction(preset: Preset) {
  const removeMutation = useRemovePreset()
  const remove = useConfirmAction(() => {
    removeMutation.mutate(preset.id, {
      onSuccess: () => {
        toastSuccess('预设已删除')
      },
      onError: (error) => {
        toastError(errorMessage(error))
      },
    })
  })
  return { removeMutation, remove }
}

/** 预设操作区：应用 / 编辑 / 删除（删除为两段式确认） */
export function PresetRowActions({
  preset,
  onEdit,
}: {
  preset: Preset
  onEdit: (preset: Preset) => void
}) {
  const switchMutation = useSwitchPreset()
  const { removeMutation, remove } = useRemoveAction(preset)

  const handleApply = () => {
    switchMutation.mutate(
      { tool: preset.tool, presetId: preset.id },
      {
        onSuccess: () => {
          toastSuccess(`已切换到 ${preset.name}`)
        },
        onError: (error) => {
          toastError(errorMessage(error))
        },
      }
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" disabled={switchMutation.isPending} onClick={handleApply}>
        {switchMutation.isPending ? '切换中…' : '应用'}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          onEdit(preset)
        }}
      >
        编辑
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={removeMutation.isPending}
        onClick={remove.trigger}
      >
        {remove.confirming ? '确认删除?' : '删除'}
      </Button>
    </div>
  )
}
