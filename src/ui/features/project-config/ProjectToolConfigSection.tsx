import type { Preset, TargetTool } from '@/domain/entities/preset'
import { useState } from 'react'
import { useApplyProjectConfig, useProjectConfig } from '@/hooks/use-project-config'
import { useT } from '@/i18n/index'
import { TOOL_META } from '@/constants/tools'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { errorMessage } from '@/utils/error-message'
import { projectApplyDisabled } from './project-config.utils'

/** 预设下拉：列出当前工具的预设，选中项即待应用的预设 id */
function PresetSelect({
  label,
  presets,
  value,
  onChange,
}: {
  label: string
  presets: readonly Preset[]
  value: string
  onChange: (presetId: string) => void
}) {
  return (
    <select
      aria-label={label}
      className="h-9 min-w-0 flex-1 rounded-lg border border-app-border bg-app-input px-3 text-sm text-app"
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    >
      {presets.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.name}
        </option>
      ))}
    </select>
  )
}

/** 单个工具的项目级配置：选预设 → 应用到当前项目目录 */
export function ProjectToolConfigSection({
  tool,
  projectPath,
  presets,
  onApplied,
}: {
  tool: TargetTool
  projectPath: string
  presets: readonly Preset[]
  onApplied: () => void
}) {
  const t = useT()
  const [presetId, setPresetId] = useState('')
  const status = useProjectConfig(projectPath, tool)
  const apply = useApplyProjectConfig()
  const selected = presetId !== '' ? presetId : (presets[0]?.id ?? '')
  const meta = TOOL_META[tool]

  const handleApply = (): void => {
    apply.mutate({ projectPath, tool, presetId: selected }, { onSuccess: onApplied })
  }

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{meta.label}</h3>
        {status.data?.status === 'installed' ? (
          <span className="text-xs text-app-accent">{t('project.active')}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <PresetSelect
          label={`${meta.label} ${t('project.preset')}`}
          presets={presets}
          value={selected}
          onChange={setPresetId}
        />
        <Button
          disabled={projectApplyDisabled(projectPath, selected, apply.isPending)}
          onClick={handleApply}
        >
          {apply.isPending ? t('project.applying') : t('project.apply')}
        </Button>
      </div>
      {apply.error ? (
        <p className="mt-2 text-xs text-app-danger" role="alert">
          {t('project.failed')} {errorMessage(apply.error)}
        </p>
      ) : null}
    </Card>
  )
}
