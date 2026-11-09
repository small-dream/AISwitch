import type { FieldErrors, UseFormRegister } from 'react-hook-form'

import { useT } from '@/i18n/index'
import { FormField } from '@/ui/components/FormField'
import { Textarea } from '@/ui/components/Textarea'
import type { PresetFormValues } from './preset-form-schema'

/**
 * Codex 专属高级区：模型目录条目（models.json）编辑，默认折叠。
 * 校验失败时必须看得见：错误提示在折叠区内，收起状态会让「保存」看起来毫无反应，
 * 因此出错时强制展开，并在标题上再给一处可见提示（用户手动收起后仍能发现）。
 */
export function CodexMetadataSection({
  register,
  errors,
}: {
  register: UseFormRegister<PresetFormValues>
  errors: FieldErrors<PresetFormValues>
}) {
  const t = useT()
  const invalid = Boolean(errors.modelMetadataJson)
  return (
    <details className="rounded-md border border-app-border-strong px-3 py-2" open={invalid}>
      <summary className="cursor-pointer text-xs font-medium text-app-muted">
        {t('presetForm.metadataSectionTitle')}
        {invalid ? (
          <span className="ml-2 text-app-danger-text">{t('presetForm.metadataInvalid')}</span>
        ) : null}
      </summary>
      <div className="space-y-1.5 pt-2">
        <p className="text-xs text-app-faint">{t('presetForm.metadataHint')}</p>
        <FormField label={t('presetForm.metadataLabel')} error={errors.modelMetadataJson?.message}>
          <Textarea
            {...register('modelMetadataJson')}
            rows={6}
            spellCheck={false}
            placeholder={'{\n  "context_window": 128000,\n  "display_name": "My Model"\n}'}
          />
        </FormField>
      </div>
    </details>
  )
}
