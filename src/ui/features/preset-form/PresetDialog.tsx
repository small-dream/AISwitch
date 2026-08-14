import type { Preset, PresetInput, TargetTool } from '@/domain/entities/preset'
import { useCreatePreset, useUpdatePreset } from '@/hooks/use-presets'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'
import { PresetForm } from './PresetForm'

function useSubmitPreset(preset: Preset | null, onClose: () => void) {
  const create = useCreatePreset()
  const update = useUpdatePreset()

  const handleError = (error: unknown) => {
    toastError(errorMessage(error))
  }

  const submit = (input: PresetInput) => {
    if (preset) {
      update.mutate(
        { id: preset.id, input },
        {
          onSuccess: () => {
            toastSuccess('预设已更新')
            onClose()
          },
          onError: handleError,
        }
      )
      return
    }
    create.mutate(input, {
      onSuccess: () => {
        toastSuccess('预设已创建')
        onClose()
      },
      onError: handleError,
    })
  }

  return { submitting: create.isPending || update.isPending, submit }
}

/** 预设创建/编辑/导入弹窗（PRD US-02 / US-07） */
export function PresetDialog({
  open,
  preset,
  draft,
  defaultTool,
  onClose,
}: {
  open: boolean
  preset: Preset | null
  draft: PresetInput | null
  defaultTool: TargetTool
  onClose: () => void
}) {
  const { submitting, submit } = useSubmitPreset(preset, onClose)

  if (!open) {
    return null
  }

  const title = preset ? '编辑预设' : draft ? '导入配置为预设' : '新建预设'

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[calc(100vh-8rem)] w-full max-w-md flex-col rounded-xl border border-app-border bg-app-card p-6">
        <h2 className="mb-4 shrink-0 text-base font-semibold">{title}</h2>
        <PresetForm
          preset={preset}
          draft={draft}
          defaultTool={defaultTool}
          submitting={submitting}
          onSubmit={submit}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}
