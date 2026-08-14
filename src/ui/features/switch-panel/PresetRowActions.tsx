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

function useApplyAction(preset: Preset) {
  const switchMutation = useSwitchPreset()
  const apply = () => {
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
  return { switchMutation, apply }
}

/** 预设操作区：测试 / 应用 / 编辑 / 删除（删除为两段式确认）；测试结果展示在信息列 */
export function PresetRowActions({
  preset,
  testPending,
  onTest,
  onEdit,
}: {
  preset: Preset
  testPending: boolean
  onTest: () => void
  onEdit: (preset: Preset) => void
}) {
  const { switchMutation, apply } = useApplyAction(preset)
  const { removeMutation, remove } = useRemoveAction(preset)

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" variant="secondary" disabled={testPending} onClick={onTest}>
        {testPending ? '测试中…' : '测试'}
      </Button>
      <Button size="sm" disabled={switchMutation.isPending} onClick={apply}>
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
