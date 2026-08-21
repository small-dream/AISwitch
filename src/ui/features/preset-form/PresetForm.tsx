import type { FieldErrors, UseFormRegister } from 'react-hook-form'

import type { Preset, PresetInput, TargetTool } from '@/domain/entities/preset'
import { useT } from '@/i18n/index'
import { Button } from '@/ui/components/Button'
import { FormField } from '@/ui/components/FormField'
import { Input } from '@/ui/components/Input'
import { PasswordInput } from '@/ui/components/PasswordInput'
import { Select } from '@/ui/components/Select'
import { CodexMetadataSection } from './CodexMetadataSection'
import type { PresetFormValues } from './preset-form-schema'
import { usePresetForm } from './use-preset-form'

function PresetFormFields({
  register,
  errors,
  tool,
}: {
  register: UseFormRegister<PresetFormValues>
  errors: FieldErrors<PresetFormValues>
  tool: TargetTool
}) {
  const t = useT()
  return (
    <>
      <FormField label={t('presetForm.targetTool')} error={errors.tool?.message}>
        <Select {...register('tool')}>
          <option value="claude-code">Claude Code</option>
          <option value="codex">Codex CLI</option>
        </Select>
      </FormField>
      <FormField label={t('presetForm.name')} error={errors.name?.message}>
        <Input {...register('name')} placeholder={t('presetForm.namePlaceholder')} />
      </FormField>
      <FormField label={t('presetForm.provider')} error={errors.providerName?.message}>
        <Input {...register('providerName')} placeholder={t('presetForm.providerPlaceholder')} />
      </FormField>
      <FormField label={t('presetForm.baseUrl')} error={errors.baseUrl?.message}>
        <Input {...register('baseUrl')} placeholder="https://open.bigmodel.cn/api/anthropic" />
      </FormField>
      <FormField label="API Key" error={errors.apiKey?.message}>
        <PasswordInput {...register('apiKey')} placeholder="sk-…" />
      </FormField>
      <FormField label={t('presetForm.model')} error={errors.model?.message}>
        <Input {...register('model')} placeholder={t('presetForm.modelPlaceholder')} />
      </FormField>
      {tool === 'claude-code' ? (
        <FormField label={t('presetForm.smallFast')} error={errors.smallFastModel?.message}>
          <Input
            {...register('smallFastModel')}
            placeholder={t('presetForm.smallFastPlaceholder')}
          />
        </FormField>
      ) : null}
      {tool === 'codex' ? <CodexMetadataSection register={register} errors={errors} /> : null}
    </>
  )
}

/** 预填草稿（导入/复制）携带密钥时的显式告知（隐私透明） */
function KeyNotice({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-app-border bg-app-sunken px-3 py-2 text-xs text-app-muted">
      {message}
    </p>
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
  const t = useT()
  return (
    <div className="flex shrink-0 justify-end gap-2 pt-4">
      <Button variant="secondary" onClick={onCancel}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" disabled={submitting}>
        {submitting ? t('common.saving') : t('common.save')}
      </Button>
    </div>
  )
}

export function PresetForm({
  preset,
  draft,
  isDuplicate,
  defaultTool,
  submitting,
  onSubmit,
  onCancel,
}: {
  preset: Preset | null
  draft: PresetInput | null
  isDuplicate: boolean
  defaultTool: TargetTool
  submitting: boolean
  onSubmit: (input: PresetInput) => void
  onCancel: () => void
}) {
  const t = useT()
  const { form, submit } = usePresetForm({ preset, draft, defaultTool, onSubmit, t })
  const {
    register,
    watch,
    formState: { errors },
  } = form

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      {/* 字段区：超高时在弹窗内滚动，操作按钮不随之移出视口 */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {draft?.apiKey ? (
          <KeyNotice
            message={t(isDuplicate ? 'presetForm.duplicateKeyNotice' : 'presetForm.draftKeyNotice')}
          />
        ) : null}
        <PresetFormFields register={register} errors={errors} tool={watch('tool')} />
      </div>
      <PresetFormActions submitting={submitting} onCancel={onCancel} />
    </form>
  )
}
