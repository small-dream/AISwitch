import { Workflow } from 'lucide-react'

import type { Bundle } from '@/domain/entities/bundle'
import type { Preset, TargetTool } from '@/domain/entities/preset'
import { useT } from '@/i18n/index'
import { Button } from '@/ui/components/Button'
import { FormField } from '@/ui/components/FormField'
import { Input } from '@/ui/components/Input'
import { Select } from '@/ui/components/Select'
import { useBundleForm, type BundleFormState } from './use-bundle-form'

const NONE = ''

function presetsOf(presets: readonly Preset[], tool: TargetTool): Preset[] {
  return presets.filter((preset) => preset.tool === tool)
}

function ToolPresetSelect({
  label,
  value,
  options,
  noneLabel,
  onChange,
}: {
  label: string
  value: string
  options: readonly Preset[]
  noneLabel: string
  onChange: (presetId: string) => void
}) {
  return (
    <FormField label={label}>
      <Select
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      >
        <option value={NONE}>{noneLabel}</option>
        {options.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

function BundleFormFields({
  form,
  presets,
  onSet,
}: {
  form: BundleFormState
  presets: readonly Preset[]
  onSet: (patch: Partial<BundleFormState>) => void
}) {
  const t = useT()
  return (
    <>
      <FormField label={t('bundle.name')} htmlFor="bundle-name">
        <Input
          id="bundle-name"
          value={form.name}
          placeholder={t('bundle.namePlaceholder')}
          onChange={(event) => {
            onSet({ name: event.target.value })
          }}
        />
      </FormField>
      <ToolPresetSelect
        label="Claude Code"
        value={form.claudePresetId}
        options={presetsOf(presets, 'claude-code')}
        noneLabel={t('bundle.noSwitch')}
        onChange={(presetId) => {
          onSet({ claudePresetId: presetId })
        }}
      />
      <ToolPresetSelect
        label="Codex CLI"
        value={form.codexPresetId}
        options={presetsOf(presets, 'codex')}
        noneLabel={t('bundle.noSwitch')}
        onChange={(presetId) => {
          onSet({ codexPresetId: presetId })
        }}
      />
    </>
  )
}

function BundleDialogActions({
  error,
  submitting,
  onCancel,
  onSave,
}: {
  error: string | null
  submitting: boolean
  onCancel: () => void
  onSave: () => void
}) {
  const t = useT()
  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-app-danger-text">{error}</p> : null}
      <div className="flex shrink-0 justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onSave} disabled={submitting}>
          {submitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  )
}

/** 组合预设新建/编辑弹窗（US-17）：名称 + 各工具预设下拉，至少选择一个 */
export function BundleDialog({
  open,
  editing,
  presets,
  onClose,
}: {
  open: boolean
  editing: Bundle | null
  presets: readonly Preset[]
  onClose: () => void
}) {
  const t = useT()
  const { form, error, submitting, set, submit } = useBundleForm({ editing, onClose })

  if (!open) {
    return null
  }

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-dialog-in flex max-h-[calc(100vh-8rem)] w-full max-w-md flex-col rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl">
        <h2 className="mb-4 flex shrink-0 items-center gap-2 text-base font-semibold">
          <Workflow className="h-4 w-4 text-app-accent" aria-hidden />
          {editing ? t('bundle.title.edit') : t('bundle.title.create')}
        </h2>
        <div className="space-y-4">
          <BundleFormFields form={form} presets={presets} onSet={set} />
          <BundleDialogActions
            error={error}
            submitting={submitting}
            onCancel={onClose}
            onSave={submit}
          />
        </div>
      </div>
    </div>
  )
}
