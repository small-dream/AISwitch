import { Wand2 } from 'lucide-react'
import { useState } from 'react'

import { PROVIDER_TEMPLATES } from '@/constants/provider-templates'
import { applyProviderTemplate } from '@/domain/rules/apply-provider-template'
import type { TemplateFill } from '@/domain/rules/apply-provider-template'
import { useT } from '@/i18n/index'
import { FormField } from '@/ui/components/FormField'
import { Select } from '@/ui/components/Select'

const PLACEHOLDER = ''

/** 表单顶部「从供应商模板填充」：选择后预填品牌 / Base URL / 模型（US-19） */
export function ProviderTemplatePicker({ onApply }: { onApply: (fill: TemplateFill) => void }) {
  const t = useT()
  const [value, setValue] = useState(PLACEHOLDER)

  return (
    <FormField label={t('template.pickerLabel')}>
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 shrink-0 text-app-accent" aria-hidden />
        <Select
          value={value}
          aria-label={t('template.pickerLabel')}
          onChange={(event) => {
            const templateId = event.target.value
            setValue(PLACEHOLDER)
            if (templateId === PLACEHOLDER) {
              return
            }
            const template = PROVIDER_TEMPLATES.find((item) => item.id === templateId)
            if (template) {
              onApply(applyProviderTemplate(template))
            }
          }}
        >
          <option value={PLACEHOLDER}>{t('template.placeholder')}</option>
          {PROVIDER_TEMPLATES.map((template) => (
            <option key={template.id} value={template.id}>
              {template.local ? `${template.label} · ${t('template.local')}` : template.label}
            </option>
          ))}
        </Select>
      </div>
    </FormField>
  )
}
