import { Check, FolderOpen, RefreshCw, X } from 'lucide-react'

import { useProjectDirectory } from '@/hooks/use-project-directory'
import { useT } from '@/i18n/index'
import { Button } from '@/ui/components/Button'

export function ProjectDirectoryPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (path: string) => void
}) {
  const t = useT()
  const picker = useProjectDirectory()
  const hasSelection = value !== ''

  const choose = async (): Promise<void> => {
    const picked = await picker.choose()
    if (picked) {
      onChange(picked.relativePath)
    }
  }

  return (
    <div className="min-w-0 flex-1">
      {hasSelection ? (
        <div className="flex min-h-9 items-center gap-2 rounded-lg border border-app-accent/40 bg-app-accent-soft px-3">
          <Check className="h-4 w-4 shrink-0 text-app-accent" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm text-app" title={picker.directory?.absolutePath ?? value}>
            <span className="font-medium">{picker.directory?.name ?? value}</span>
            <span className="ml-2 text-xs text-app-muted">{value}</span>
          </span>
          <button type="button" className="text-xs text-app-muted hover:text-app" onClick={() => { void choose() }}>
            {t('project.changeDirectory')}
          </button>
        </div>
      ) : (
        <Button variant="secondary" className="w-full justify-start" disabled={picker.isPicking} onClick={() => { void choose() }}>
          {picker.isPicking ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : <FolderOpen className="h-4 w-4" aria-hidden />}
          {picker.isPicking ? t('project.choosingDirectory') : t('project.chooseDirectory')}
        </Button>
      )}
      {picker.error ? (
        <p className="mt-1 flex items-start gap-1 text-xs text-app-danger" role="alert">
          <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {picker.error.message}
        </p>
      ) : null}
    </div>
  )
}
