import type { TargetTool } from '@/domain/entities/preset'
import type { ProjectConfigRecord } from '@/domain/entities/project-config-record'
import { useT } from '@/i18n/index'
import { ProjectRemoveButton } from './ProjectRemoveButton'

export function ProjectConfigRecords({
  records,
  tool,
  pending,
  onSelect,
  onRemove,
}: {
  records: readonly ProjectConfigRecord[]
  tool: TargetTool
  pending: boolean
  onSelect: (projectPath: string) => void
  onRemove: (projectPath: string) => void
}) {
  const t = useT()
  if (records.length === 0) {
    return null
  }
  return (
    <div className="mt-4 border-t border-app-border pt-3">
      <h3 className="mb-2 text-xs font-medium text-app-muted">{t('project.records')}</h3>
      <ul className="space-y-2">
        {records.map((record) => (
          <li key={`${record.tool}:${record.projectPath}`} className="flex items-center gap-2 rounded-lg border border-app-border bg-app-sunken px-3 py-2">
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left text-sm text-app hover:text-app-accent"
              title={record.projectPath}
              onClick={() => { onSelect(record.projectPath) }}
            >
              {record.projectPath}
            </button>
            <ProjectRemoveButton
              disabled={record.tool !== tool}
              pending={pending}
              onRemove={() => { onRemove(record.projectPath) }}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
