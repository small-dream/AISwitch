import clsx from 'clsx'
import { useState } from 'react'

import { TARGET_TOOLS, TOOL_META } from '@/constants/tools'
import type { Preset, TargetTool } from '@/domain/entities/preset'
import { useUIStore } from '@/stores/ui-store'
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
    <div className="mb-4 flex gap-1 rounded-lg bg-zinc-800/50 p-1">
      {TARGET_TOOLS.map((tool) => (
        <button
          key={tool}
          type="button"
          onClick={() => {
            onChange(tool)
          }}
          className={clsx(
            'flex-1 rounded-md px-3 py-1.5 text-sm transition-colors',
            activeTool === tool ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          {TOOL_META[tool].label}
        </button>
      ))}
    </div>
  )
}

export function SwitchPanel() {
  const activeTool = useUIStore((state) => state.activeTool)
  const setActiveTool = useUIStore((state) => state.setActiveTool)
  const [editing, setEditing] = useState<Preset | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">模型预设</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          新建预设
        </Button>
      </div>

      <ToolTabs activeTool={activeTool} onChange={setActiveTool} />

      <PresetList
        tool={activeTool}
        onEdit={(preset) => {
          setEditing(preset)
          setFormOpen(true)
        }}
      />

      <PresetDialog
        open={formOpen}
        preset={editing}
        onClose={() => {
          setFormOpen(false)
        }}
      />
    </Card>
  )
}
