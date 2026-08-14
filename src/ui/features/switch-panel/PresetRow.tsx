import type { Preset } from '@/domain/entities/preset'
import { maskApiKey } from '@/utils/mask'
import { Badge } from '@/ui/components/Badge'
import { PresetRowActions } from './PresetRowActions'

export function PresetRow({
  preset,
  onEdit,
}: {
  preset: Preset
  onEdit: (preset: Preset) => void
}) {
  return (
    <li className="rounded-lg border border-app-border bg-app-sunken p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{preset.name}</span>
            <Badge>{preset.providerName}</Badge>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-app-muted">{preset.model}</p>
          <p className="mt-0.5 font-mono text-[11px] text-app-faint">{maskApiKey(preset.apiKey)}</p>
        </div>
        <PresetRowActions preset={preset} onEdit={onEdit} />
      </div>
    </li>
  )
}
