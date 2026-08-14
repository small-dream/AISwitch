import clsx from 'clsx'
import { useState } from 'react'

import { TARGET_TOOLS, TOOL_META } from '@/constants/tools'
import type { Preset, PresetInput, TargetTool } from '@/domain/entities/preset'
import { useImportPreset } from '@/hooks/use-import-preset'
import { useUIStore } from '@/stores/ui-store'
import { toastError } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { PresetDialog } from '@/ui/features/preset-form/PresetDialog'
import { PresetList } from './PresetList'

function ToolTabs({
  activeTool,
  onChange,
}: {
  activeTool: TargetTool
  onChange: (tool: TargetTool) => void
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-lg bg-app-sunken p-1">
      {TARGET_TOOLS.map((tool) => (
        <button
          key={tool}
          type="button"
          onClick={() => {
            onChange(tool)
          }}
          className={clsx(
            'flex-1 rounded-md px-3 py-1.5 text-sm transition-colors',
            activeTool === tool ? 'bg-app-tab-active text-app' : 'text-app-muted hover:text-app'
          )}
        >
          {TOOL_META[tool].label}
        </button>
      ))}
    </div>
  )
}

/** 面板右上操作区：导入当前配置（US-07）+ 新建预设 */
function PanelActions({
  tool,
  onCreate,
  onImported,
}: {
  tool: TargetTool
  onCreate: () => void
  onImported: (input: PresetInput) => void
}) {
  const importMutation = useImportPreset()

  const handleImport = () => {
    importMutation.mutate(tool, {
      onSuccess: onImported,
      onError: (error) => {
        toastError(errorMessage(error))
      },
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={importMutation.isPending}
        onClick={handleImport}
      >
        {importMutation.isPending ? '导入中…' : '导入当前配置'}
      </Button>
      <Button size="sm" onClick={onCreate}>
        新建预设
      </Button>
    </div>
  )
}

export function SwitchPanel() {
  const activeTool = useUIStore((state) => state.activeTool)
  const setActiveTool = useUIStore((state) => state.setActiveTool)
  const [editing, setEditing] = useState<Preset | null>(null)
  const [draft, setDraft] = useState<PresetInput | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setDraft(null)
    setFormOpen(true)
  }

  const openImported = (input: PresetInput) => {
    setEditing(null)
    setDraft(input)
    setFormOpen(true)
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">模型预设</h2>
        <PanelActions tool={activeTool} onCreate={openCreate} onImported={openImported} />
      </div>

      <ToolTabs activeTool={activeTool} onChange={setActiveTool} />

      <PresetList
        tool={activeTool}
        onEdit={(preset) => {
          setEditing(preset)
          setDraft(null)
          setFormOpen(true)
        }}
      />

      <PresetDialog
        open={formOpen}
        preset={editing}
        draft={draft}
        defaultTool={activeTool}
        onClose={() => {
          setFormOpen(false)
        }}
      />
    </Card>
  )
}
