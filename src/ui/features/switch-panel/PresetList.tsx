import { Inbox } from 'lucide-react'

import type { TargetTool, Preset } from '@/domain/entities/preset'
import { usePresets } from '@/hooks/use-presets'
import { EmptyState } from '@/ui/components/EmptyState'
import { PresetRow } from './PresetRow'

export function PresetList({
  tool,
  onEdit,
}: {
  tool: TargetTool
  onEdit: (preset: Preset) => void
}) {
  const { data: presets, isLoading } = usePresets()

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
        title="暂无预设"
        description="点击右上角「新建预设」，创建第一个可复用的模型配置档案"
      />
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((preset) => (
        <PresetRow key={preset.id} preset={preset} onEdit={onEdit} />
      ))}
    </ul>
  )
}
