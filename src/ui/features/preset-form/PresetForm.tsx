import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type FieldErrors, type UseFormRegister } from 'react-hook-form'

import type { Preset, PresetInput, TargetTool } from '@/domain/entities/preset'
import { Button } from '@/ui/components/Button'
import { FormField } from '@/ui/components/FormField'
import { Input } from '@/ui/components/Input'
import { PasswordInput } from '@/ui/components/PasswordInput'
import { Select } from '@/ui/components/Select'
import { CodexMetadataSection } from './CodexMetadataSection'
import { metadataToFieldText, parseModelMetadataField } from './model-metadata'
import { type PresetFormValues, presetFormSchema } from './preset-form-schema'

const EMPTY_VALUES: Omit<PresetFormValues, 'tool'> = {
  name: '',
  providerName: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  smallFastModel: '',
  modelMetadataJson: '',
}

/** 编辑取预设本体；导入取草稿（US-07）；新建取空值，目标工具默认当前 Tab */
function toFormValues(
  preset: Preset | null,
  draft: PresetInput | null,
  defaultTool: TargetTool,
): PresetFormValues {
  const source: PresetInput | null = preset ?? draft
  if (!source) {
    return { ...EMPTY_VALUES, tool: defaultTool }
  }
  return {
    tool: source.tool,
    name: source.name,
    providerName: source.providerName,
    baseUrl: source.baseUrl ?? '',
    apiKey: source.apiKey,
    model: source.model,
    smallFastModel: source.smallFastModel ?? '',
    modelMetadataJson: metadataToFieldText(source.modelMetadata),
  }
}

/** 表单值 → 领域输入：空串归一化为 undefined，smallFastModel 仅 Claude 使用，元数据 JSON 仅 Codex 使用 */
function toPresetInput(values: PresetFormValues): PresetInput {
  const smallFastModel =
    values.tool === 'claude-code' && values.smallFastModel ? values.smallFastModel : undefined
  const { modelMetadataJson, ...rest } = values
  const modelMetadata =
    values.tool === 'codex'
      ? parseModelMetadataField(modelMetadataJson ?? '', values.model).entry
      : undefined
  return { ...rest, baseUrl: values.baseUrl || undefined, smallFastModel, modelMetadata }
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
      {tool === 'codex' ? <CodexMetadataSection register={register} errors={errors} /> : null}
    </>
  )
}

/** 操作行固定于弹窗底部，不随字段区滚动 */
function PresetFormActions({
  submitting,
  onCancel,
}: {
  submitting: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex shrink-0 justify-end gap-2 pt-4">
      <Button variant="secondary" onClick={onCancel}>
        取消
      </Button>
      <Button type="submit" disabled={submitting}>
        {submitting ? '保存中…' : '保存'}
      </Button>
    </div>
  )
}

export function PresetForm({
  preset,
  draft,
  defaultTool,
  submitting,
  onSubmit,
  onCancel,
}: {
  preset: Preset | null
  draft: PresetInput | null
  defaultTool: TargetTool
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
    defaultValues: toFormValues(preset, draft, defaultTool),
  })

  useEffect(() => {
    reset(toFormValues(preset, draft, defaultTool))
  }, [preset, draft, defaultTool, reset])

  const submit = handleSubmit((values) => {
    onSubmit(toPresetInput(values))
  })

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      {/* 字段区：超高时在弹窗内滚动，操作按钮不随之移出视口 */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <PresetFormFields register={register} errors={errors} tool={watch('tool')} />
      </div>
      <PresetFormActions submitting={submitting} onCancel={onCancel} />
    </form>
  )
}
