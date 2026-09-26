import { Wand2 } from 'lucide-react'
import { useState } from 'react'

import { templatesForTool } from '@/constants/provider-templates'
import type { TargetTool } from '@/domain/entities/preset'
import { applyProviderTemplate } from '@/domain/rules/apply-provider-template'
import type { TemplateFill } from '@/domain/rules/apply-provider-template'
import { useT } from '@/i18n/index'
import { FormField } from '@/ui/components/FormField'
import { Select } from '@/ui/components/Select'

const PLACEHOLDER = ''

/**
 * 表单顶部「从供应商模板填充」：选择后预填品牌 / Base URL / 模型（US-19）。
 * 只列出当前工具适用的模板——同一供应商在 Claude Code 与 Codex 下的地址不同。
 */
export function ProviderTemplatePicker({
  tool,
  onApply,
}: {
  tool: TargetTool
  onApply: (fill: TemplateFill) => void
}) {
  const t = useT()
  const [value, setValue] = useState(PLACEHOLDER)
  const templates = templatesForTool(tool)

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
            const template = templates.find((item) => item.id === templateId)
            const fill = template ? applyProviderTemplate(template, tool) : null
            if (fill) {
              onApply(fill)
            }
          }}
        >
          <option value={PLACEHOLDER}>{t('template.placeholder')}</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.local ? `${template.label} · ${t('template.local')}` : template.label}
            </option>
          ))}
        </Select>
      </div>
    </FormField>
  )
}
