import { SlidersHorizontal } from 'lucide-react'

import type { Preset, PresetInput, TargetTool } from '@/domain/entities/preset'
import { useCreatePreset, useUpdatePreset } from '@/hooks/use-presets'
import { useT, type TranslationKey } from '@/i18n/index'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'
import { PresetForm } from './PresetForm'

function useSubmitPreset(preset: Preset | null, onClose: () => void) {
  const create = useCreatePreset()
  const update = useUpdatePreset()
  const t = useT()

  const handleError = (error: unknown) => {
    toastError(errorMessage(error))
  }

  const submit = (input: PresetInput) => {
    if (preset) {
      update.mutate(
        { id: preset.id, input },
        {
          onSuccess: () => {
            toastSuccess(t('presetForm.updated'))
            onClose()
          },
          onError: handleError,
        }
      )
      return
    }
    create.mutate(input, {
      onSuccess: () => {
        toastSuccess(t('presetForm.created'))
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
  const t = useT()

  if (!open) {
    return null
  }

  const titleKey: TranslationKey = preset
    ? 'presetForm.title.edit'
    : draft
      ? 'presetForm.title.import'
      : 'presetForm.title.create'
  const title = t(titleKey)

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-dialog-in flex max-h-[calc(100vh-8rem)] w-full max-w-md flex-col rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl">
        <h2 className="mb-4 flex shrink-0 items-center gap-2 text-base font-semibold">
          <SlidersHorizontal className="h-4 w-4 text-app-accent" aria-hidden />
          {title}
        </h2>
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
