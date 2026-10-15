import type { TargetTool, Preset } from '@/domain/entities/preset'
import { useT } from '@/i18n/index'
import { usePresets } from '@/hooks/use-presets'
import { PresetRow } from './PresetRow'
import { SubscriptionPresetRow } from './SubscriptionPresetRow'

export function PresetList({
  tool,
  onEdit,
  onDuplicate,
}: {
  tool: TargetTool
  onEdit: (preset: Preset) => void
  onDuplicate: (preset: Preset) => void
}) {
  const { data: presets, isLoading } = usePresets()
  const t = useT()

  if (isLoading) {
    return (
      <ul className="animate-pulse space-y-2">
        <li className="h-[74px] rounded-lg border border-app-border bg-app-sunken" />
        <li className="h-[74px] rounded-lg border border-app-border bg-app-sunken" />
      </ul>
    )
  }

  const items = (presets ?? []).filter((preset) => preset.tool === tool)

  return (
    <ul className="space-y-2">
      <SubscriptionPresetRow tool={tool} presets={items} />
      {items.map((preset) => (
        <PresetRow key={preset.id} preset={preset} onEdit={onEdit} onDuplicate={onDuplicate} />
      ))}
      {items.length === 0 ? (
        <li className="px-1 pt-1 text-xs text-app-faint">{t('presetList.emptyHint')}</li>
      ) : null}
    </ul>
  )
}
