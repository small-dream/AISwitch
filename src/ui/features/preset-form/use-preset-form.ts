import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import type { Preset, PresetInput, TargetTool } from '@/domain/entities/preset'
import type { TFn } from '@/i18n/index'
import { buildPresetFormSchema, type PresetFormValues } from './preset-form-schema'
import { toFormValues, toPresetInput } from './preset-form-values'

interface UsePresetFormArgs {
  preset: Preset | null
  draft: PresetInput | null
  defaultTool: TargetTool
  onSubmit: (input: PresetInput) => void
  t: TFn
}

/** 预设表单的 RHF 装配：schema 构建、默认值、外部数据变化时重置、提交归一化 */
export function usePresetForm({ preset, draft, defaultTool, onSubmit, t }: UsePresetFormArgs) {
  const schema = useMemo(() => buildPresetFormSchema(t), [t])
  const form = useForm<PresetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(preset, draft, defaultTool),
  })

  useEffect(() => {
    form.reset(toFormValues(preset, draft, defaultTool))
  }, [preset, draft, defaultTool, form])

  const submit = form.handleSubmit((values) => {
    onSubmit(toPresetInput(values))
  })

  return { form, submit }
}
