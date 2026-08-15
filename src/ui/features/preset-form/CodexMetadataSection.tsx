import type { FieldErrors, UseFormRegister } from 'react-hook-form'

import { useT } from '@/i18n/index'
import { FormField } from '@/ui/components/FormField'
import { Textarea } from '@/ui/components/Textarea'
import type { PresetFormValues } from './preset-form-schema'

/** Codex 专属高级区：模型目录条目（models.json）编辑，默认折叠 */
export function CodexMetadataSection({
  register,
  errors,
}: {
  register: UseFormRegister<PresetFormValues>
  errors: FieldErrors<PresetFormValues>
}) {
  const t = useT()
  return (
    <details className="rounded-md border border-app-border-strong px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium text-app-muted">
        {t('presetForm.metadataSectionTitle')}
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
