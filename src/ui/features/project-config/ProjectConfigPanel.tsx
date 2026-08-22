import { FolderCog } from 'lucide-react'
import { useState } from 'react'

import { TARGET_TOOLS } from '@/constants/tools'
import type { TargetTool } from '@/domain/entities/preset'
import { usePresets } from '@/hooks/use-presets'
import { useProjectConfigRecords, useRemoveProjectConfig } from '@/hooks/use-project-config'
import { useT } from '@/i18n/index'
import { Card } from '@/ui/components/Card'
import { errorMessage } from '@/utils/error-message'
import { ProjectConfigRecords } from './ProjectConfigRecords'
import { ProjectDirectoryPicker } from './ProjectDirectoryPicker'
import { ProjectToolConfigSection } from './ProjectToolConfigSection'

function ProjectStatus({ error }: { error: unknown }) {
  const t = useT()
  return error ? <p className="mt-2 text-xs text-app-danger" role="alert">{t('project.failed')} {errorMessage(error)}</p> : null
}

export function ProjectConfigPanel() {
  const t = useT()
  const { data: presets = [] } = usePresets()
  const { data: claudeRecords = [] } = useProjectConfigRecords('claude-code')
  const { data: codexRecords = [] } = useProjectConfigRecords('codex')
  const [projectPath, setProjectPath] = useState('')
  const [error, setError] = useState<unknown>(null)
  const remove = useRemoveProjectConfig()
  const records = [...claudeRecords, ...codexRecords]
  const presetsFor = (tool: TargetTool) => presets.filter((preset) => preset.tool === tool)
  const handleApplied = (): void => { setProjectPath(''); setError(null) }
  const handleRemove = (path: string, tool: TargetTool): void => { remove.mutate({ projectPath: path, tool }, { onError: setError }) }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <FolderCog className="h-4 w-4 text-app-accent" aria-hidden />
        <h2 className="text-base font-semibold">{t('project.title')}</h2>
      </div>
      <p className="mb-3 text-xs text-app-muted">{t('project.priority')}</p>
      <ProjectDirectoryPicker value={projectPath} onChange={setProjectPath} />
      <ProjectStatus error={error} />
      {projectPath ? <div className="mt-3 space-y-2">{TARGET_TOOLS.map((tool) => <ProjectToolConfigSection key={tool} tool={tool} projectPath={projectPath} presets={presetsFor(tool)} onApplied={handleApplied} />)}</div> : null}
      <ProjectConfigRecords records={records} pending={remove.isPending} onSelect={setProjectPath} onRemove={handleRemove} />
    </Card>
  )
}
