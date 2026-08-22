import { Pencil, Play, Trash2, Workflow } from 'lucide-react'

import type { Bundle } from '@/domain/entities/bundle'
import type { Preset } from '@/domain/entities/preset'
import { useBundles } from '@/hooks/use-bundles'
import { usePresets } from '@/hooks/use-presets'
import { useT } from '@/i18n/index'
import { Badge } from '@/ui/components/Badge'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { BundleDialog } from './BundleDialog'
import { useBundleActions } from './use-bundle-actions'
import { useBundleDialog } from './use-bundle-dialog'

function memberPreset(
  presets: readonly Preset[],
  tool: 'claude-code' | 'codex',
  bundle: Bundle
): Preset | undefined {
  const presetId = tool === 'claude-code' ? bundle.claudePresetId : bundle.codexPresetId
  return presetId ? presets.find((preset) => preset.id === presetId) : undefined
}

function BundleRowInfo({ bundle, presets }: { bundle: Bundle; presets: readonly Preset[] }) {
  const t = useT()
  const claude = memberPreset(presets, 'claude-code', bundle)
  const codex = memberPreset(presets, 'codex', bundle)
  return (
    <div className="min-w-0">
      <span className="truncate font-medium">{bundle.name}</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <Badge>Claude: {claude ? claude.name : t('bundle.noSwitch')}</Badge>
        <Badge>Codex: {codex ? codex.name : t('bundle.noSwitch')}</Badge>
      </div>
    </div>
  )
}

function BundleRowActions({
  switching,
  onSwitch,
  onEdit,
  onRemove,
}: {
  switching: boolean
  onSwitch: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  const t = useT()
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" disabled={switching} onClick={onSwitch}>
        <Play className="h-3.5 w-3.5" aria-hidden />
        {switching ? t('bundle.switching') : t('bundle.apply')}
      </Button>
      <Button size="sm" variant="secondary" aria-label={t('common.edit')} onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </Button>
      <Button size="sm" variant="secondary" aria-label={t('common.delete')} onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  )
}

function BundleRow({
  bundle,
  presets,
  switching,
  onSwitch,
  onEdit,
  onRemove,
}: {
  bundle: Bundle
  presets: readonly Preset[]
  switching: boolean
  onSwitch: (bundle: Bundle) => void
  onEdit: (bundle: Bundle) => void
  onRemove: (bundle: Bundle) => void
}) {
  return (
    <li className="animate-fade-in rounded-lg border border-app-border bg-app-sunken p-3 transition-colors duration-150 hover:border-app-accent/40 hover:bg-app-hover">
      <div className="flex items-start justify-between gap-3">
        <BundleRowInfo bundle={bundle} presets={presets} />
        <BundleRowActions
          switching={switching}
          onSwitch={() => {
            onSwitch(bundle)
          }}
          onEdit={() => {
            onEdit(bundle)
          }}
          onRemove={() => {
            onRemove(bundle)
          }}
        />
      </div>
    </li>
  )
}

/** 组合切换面板（US-17）：聚合 Claude + Codex 预设，一次应用全家桶切换 */
export function BundlePanel() {
  const t = useT()
  const { data: bundles } = useBundles()
  const { data: presets } = usePresets()
  const { handleSwitch, handleRemove, switching } = useBundleActions()
  const { dialog, openCreate, openEdit, close } = useBundleDialog()

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Workflow className="h-4 w-4 text-app-accent" aria-hidden />
          {t('bundle.title')}
        </h2>
        <Button size="sm" onClick={openCreate}>
          {t('bundle.create')}
        </Button>
      </div>

      {!bundles || bundles.length === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">{t('bundle.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {bundles.map((bundle) => (
            <BundleRow
              key={bundle.id}
              bundle={bundle}
              presets={presets ?? []}
              switching={switching}
              onSwitch={handleSwitch}
              onEdit={openEdit}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}

      <BundleDialog
        key={dialog.editing?.id ?? 'new'}
        open={dialog.open}
        editing={dialog.editing}
        presets={presets ?? []}
        onClose={close}
      />
    </Card>
  )
}
