import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type FieldErrors, type UseFormRegister } from 'react-hook-form'

import type { Preset, PresetInput, TargetTool } from '@/domain/entities/preset'
import { Button } from '@/ui/components/Button'
import { FormField } from '@/ui/components/FormField'
import { Input } from '@/ui/components/Input'
import { PasswordInput } from '@/ui/components/PasswordInput'
import { Select } from '@/ui/components/Select'
import { type PresetFormValues, presetFormSchema } from './preset-form-schema'

function toDefaults(preset: Preset | null): PresetFormValues {
  if (!preset) {
    return {
      tool: 'claude-code',
      name: '',
      providerName: '',
      baseUrl: '',
      apiKey: '',
      model: '',
      smallFastModel: '',
    }
  }
  return {
    tool: preset.tool,
    name: preset.name,
    providerName: preset.providerName,
    baseUrl: preset.baseUrl ?? '',
    apiKey: preset.apiKey,
    model: preset.model,
    smallFastModel: preset.smallFastModel ?? '',
  }
}

/** 表单值 → 领域输入：空串归一化为 undefined，smallFastModel 仅 Claude 使用 */
function toPresetInput(values: PresetFormValues): PresetInput {
  const smallFastModel =
    values.tool === 'claude-code' && values.smallFastModel ? values.smallFastModel : undefined
  return { ...values, baseUrl: values.baseUrl || undefined, smallFastModel }
}

function PresetFormFields({
  register,
  errors,
  tool,
}: {
  register: UseFormRegister<PresetFormValues>
  errors: FieldErrors<PresetFormValues>
  tool: TargetTool
}) {
  return (
    <>
      <FormField label="目标工具" error={errors.tool?.message}>
        <Select {...register('tool')}>
          <option value="claude-code">Claude Code</option>
          <option value="codex">Codex CLI</option>
        </Select>
      </FormField>
      <FormField label="预设名称" error={errors.name?.message}>
        <Input {...register('name')} placeholder="如：GLM-4.6" />
      </FormField>
      <FormField label="供应商名称" error={errors.providerName?.message}>
        <Input {...register('providerName')} placeholder="如：智谱 GLM" />
      </FormField>
      <FormField label="Base URL（留空 = 官方 API）" error={errors.baseUrl?.message}>
        <Input {...register('baseUrl')} placeholder="https://open.bigmodel.cn/api/anthropic" />
      </FormField>
      <FormField label="API Key" error={errors.apiKey?.message}>
        <PasswordInput {...register('apiKey')} placeholder="sk-…" />
      </FormField>
      <FormField label="模型名" error={errors.model?.message}>
        <Input {...register('model')} placeholder="如：glm-4.6" />
      </FormField>
      {tool === 'claude-code' ? (
        <FormField
          label="小模型 ANTHROPIC_SMALL_FAST_MODEL（可选）"
          error={errors.smallFastModel?.message}
        >
          <Input {...register('smallFastModel')} placeholder="如：glm-4.6-air" />
        </FormField>
      ) : null}
    </>
  )
}

export function PresetForm({
  preset,
  submitting,
  onSubmit,
  onCancel,
}: {
  preset: Preset | null
  submitting: boolean
  onSubmit: (input: PresetInput) => void
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PresetFormValues>({
    resolver: zodResolver(presetFormSchema),
    defaultValues: toDefaults(preset),
  })

  useEffect(() => {
    reset(toDefaults(preset))
  }, [preset, reset])

  const submit = handleSubmit((values) => {
    onSubmit(toPresetInput(values))
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <PresetFormFields register={register} errors={errors} tool={watch('tool')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? '保存中…' : '保存'}
        </Button>
      </div>
    </form>
  )
}
