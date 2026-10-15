import type { AppScope } from '@/types/app-scope'
import { ProjectConfigPanel } from '@/ui/features/project-config/ProjectConfigPanel'
import { StatusCards } from '@/ui/features/status-cards/StatusCards'
import { SwitchPanel } from '@/ui/features/switch-panel/SwitchPanel'

export function ConfigWorkspace({ scope }: { scope: AppScope }) {
  if (scope === 'project') {
    return <ProjectConfigPanel />
  }
  return (
    <>
      <StatusCards />
      <SwitchPanel />
    </>
  )
}
