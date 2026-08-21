import { Inbox } from 'lucide-react'

import type { TargetTool, Preset } from '@/domain/entities/preset'
import { useT } from '@/i18n/index'
import { usePresets } from '@/hooks/use-presets'
import { EmptyState } from '@/ui/components/EmptyState'
import { PresetRow } from './PresetRow'

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
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-8 w-8" strokeWidth={1.5} />}
        title={t('presetList.emptyTitle')}
        description={t('presetList.emptyDescription')}
      />
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((preset) => (
        <PresetRow key={preset.id} preset={preset} onEdit={onEdit} onDuplicate={onDuplicate} />
      ))}
    </ul>
  )
}
