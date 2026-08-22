import { useState } from 'react'

import type { Bundle } from '@/domain/entities/bundle'
import { useCreateBundle, useUpdateBundle } from '@/hooks/use-bundles'
import { useT } from '@/i18n/index'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'

export interface BundleFormState {
  name: string
  claudePresetId: string
  codexPresetId: string
}

const NONE = ''

/** 组合表单状态与提交（US-17）：名称 + 各工具预设，至少选择一个 */
export function useBundleForm({
  editing,
  onClose,
}: {
  editing: Bundle | null
  onClose: () => void
}) {
  const t = useT()
  const create = useCreateBundle()
  const update = useUpdateBundle()
  const [form, setForm] = useState<BundleFormState>(() => ({
    name: editing?.name ?? '',
    claudePresetId: editing?.claudePresetId ?? NONE,
    codexPresetId: editing?.codexPresetId ?? NONE,
  }))
  const [error, setError] = useState<string | null>(null)
  const submitting = create.isPending || update.isPending

  const set = (patch: Partial<BundleFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setError(null)
  }

  const submit = () => {
    const name = form.name.trim()
    const noneSelected = !form.claudePresetId && !form.codexPresetId
    if (!name || noneSelected) {
      setError(noneSelected ? t('bundle.atLeastOne') : t('validation.nameRequired'))
      return
    }
    const input = {
      name,
      claudePresetId: form.claudePresetId === NONE ? undefined : form.claudePresetId,
      codexPresetId: form.codexPresetId === NONE ? undefined : form.codexPresetId,
    }
    const onSuccess = () => {
      toastSuccess(t(editing ? 'bundle.updated' : 'bundle.created'))
      onClose()
    }
    const onError = (e: unknown) => {
      toastError(errorMessage(e))
    }
    if (editing) {
      update.mutate({ id: editing.id, input }, { onSuccess, onError })
      return
    }
    create.mutate(input, { onSuccess, onError })
  }

  return { form, error, submitting, set, submit }
}
