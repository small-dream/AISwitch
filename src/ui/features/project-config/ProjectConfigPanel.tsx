import { FolderCog } from 'lucide-react'
import { useState } from 'react'

import { usePresets } from '@/hooks/use-presets'
import {
  useApplyProjectConfig,
  useProjectConfig,
  useProjectConfigRecords,
  useRemoveProjectConfig,
} from '@/hooks/use-project-config'
import { useUIStore } from '@/stores/ui-store'
import { useT } from '@/i18n/index'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { projectApplyDisabled } from './project-config.utils'
import { ProjectDirectoryPicker } from './ProjectDirectoryPicker'
import { errorMessage } from '@/utils/error-message'
import { ProjectConfigRecords } from './ProjectConfigRecords'

function ProjectStatus({ isActive, error }: { isActive: boolean; error: unknown }) {
  const t = useT()
  if (error) {
    return (
      <p className="mt-2 text-xs text-app-danger" role="alert">
        {t('project.failed')} {errorMessage(error)}
      </p>
    )
  }
  if (isActive) {
    return <p className="mt-2 text-xs text-app-accent">{t('project.active')}</p>
  }
  return null
}

export function ProjectConfigPanel() {
  const t = useT()
  const tool = useUIStore((state) => state.activeTool)
  const { data: presets = [] } = usePresets()
  const [projectPath, setProjectPath] = useState('')
  const [presetId, setPresetId] = useState('')
  const status = useProjectConfig(projectPath, tool)
  const { data: records = [] } = useProjectConfigRecords(tool)
  const apply = useApplyProjectConfig()
  const remove = useRemoveProjectConfig()
  const options = presets.filter((preset) => preset.tool === tool)
  const selected = presetId !== '' ? presetId : options[0]?.id ?? ''

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <FolderCog className="h-4 w-4 text-app-accent" aria-hidden />
        <h2 className="text-base font-semibold">{t('project.title')}</h2>
      </div>
      <p className="mb-3 text-xs text-app-muted">{t('project.priority')}</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <ProjectDirectoryPicker value={projectPath} onChange={setProjectPath} />
        <select aria-label={t('project.preset')} className="h-9 rounded-lg border border-app-border bg-app-input px-3 text-sm text-app" value={selected} onChange={(event) => { setPresetId(event.target.value) }}>
          {options.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
        </select>
        <div className="flex gap-2">
          <Button disabled={projectApplyDisabled(projectPath, selected, apply.isPending)} onClick={() => { apply.mutate({ projectPath, tool, presetId: selected }) }}>{apply.isPending ? t('project.applying') : t('project.apply')}</Button>
        </div>
      </div>
      <ProjectStatus isActive={status.data?.status === 'installed'} error={apply.error ?? remove.error} />
      <ProjectConfigRecords
        records={records}
        tool={tool}
        pending={remove.isPending}
        onSelect={setProjectPath}
        onRemove={(path) => { remove.mutate({ projectPath: path, tool }) }}
      />
    </Card>
  )
}
