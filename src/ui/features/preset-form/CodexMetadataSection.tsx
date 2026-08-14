import type { FieldErrors, UseFormRegister } from 'react-hook-form'

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
  return (
    <details className="rounded-md border border-app-border-strong px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium text-app-muted">
        高级：模型目录条目（可选，仅 Codex 第三方模型需要）
      </summary>
      <div className="space-y-1.5 pt-2">
        <p className="text-xs text-app-faint">
          粘贴厂商提供的单条条目，或整份 models.json 文件（原样保存，切换后同族模型都出现在 Codex 选单）。
          Codex 依靠它获取上下文窗口等模型元数据；留空则回落内置目录。
          需包含与模型名一致的条目（slug 缺失时保存自动补齐）。
        </p>
        <FormField label="模型元数据 JSON" error={errors.modelMetadataJson?.message}>
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
