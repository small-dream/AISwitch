import type { Preset } from '@/domain/entities/preset'
import { useT } from '@/i18n/index'
import { useConfirmAction } from '@/hooks/use-confirm-action'
import { useRemovePreset } from '@/hooks/use-presets'
import { useSwitchPreset } from '@/hooks/use-switch'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'
import { Button } from '@/ui/components/Button'

function useRemoveAction(preset: Preset) {
  const removeMutation = useRemovePreset()
  const t = useT()
  const remove = useConfirmAction(() => {
    removeMutation.mutate(preset.id, {
      onSuccess: () => {
        toastSuccess(t('presetRow.deleted'))
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
  const t = useT()
  const apply = () => {
    switchMutation.mutate(
      { tool: preset.tool, presetId: preset.id },
      {
        onSuccess: () => {
          toastSuccess(t('presetRow.switchedTo', { name: preset.name }))
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
  const t = useT()

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" variant="secondary" disabled={testPending} onClick={onTest}>
        {testPending ? t('presetRow.testing') : t('presetRow.test')}
      </Button>
      <Button size="sm" disabled={switchMutation.isPending} onClick={apply}>
        {switchMutation.isPending ? t('presetRow.applying') : t('presetRow.apply')}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          onEdit(preset)
        }}
      >
        {t('common.edit')}
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={removeMutation.isPending}
        onClick={remove.trigger}
      >
        {remove.confirming ? t('presetRow.confirmDelete') : t('common.delete')}
      </Button>
    </div>
  )
}
