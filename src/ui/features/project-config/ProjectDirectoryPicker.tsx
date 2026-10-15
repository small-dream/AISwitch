import { Check, FolderOpen, RefreshCw, X } from 'lucide-react'

import type { PickedProjectDirectory } from '@/adapters/system/directory-picker'
import { useProjectDirectory } from '@/hooks/use-project-directory'
import { useT } from '@/i18n/index'
import { errorMessage } from '@/utils/error-message'
import { Button } from '@/ui/components/Button'

/** 已选定目录：名称 + 相对路径 + 「更换目录」 */
function PickedDirectory({
  value,
  directory,
  onChoose,
}: {
  value: string
  directory: PickedProjectDirectory | null
  onChoose: () => void
}) {
  const t = useT()
  return (
    <div className="flex min-h-9 items-center gap-2 rounded-lg border border-app-accent/40 bg-app-accent-soft px-3">
      <Check className="h-4 w-4 shrink-0 text-app-accent" aria-hidden />
      <span
        className="min-w-0 flex-1 truncate text-sm text-app"
        title={directory?.absolutePath ?? value}
      >
        <span className="font-medium">{directory?.name ?? value}</span>
        <span className="ml-2 text-xs text-app-muted">{value}</span>
      </span>
      <button type="button" className="text-xs text-app-muted hover:text-app" onClick={onChoose}>
        {t('project.changeDirectory')}
      </button>
    </div>
  )
}

/** 未选定目录：全宽「选择目录」按钮，选择中显示转圈 */
function PickDirectoryButton({
  isPicking,
  onChoose,
}: {
  isPicking: boolean
  onChoose: () => void
}) {
  const t = useT()
  return (
    <Button
      variant="secondary"
      className="w-full justify-start"
      disabled={isPicking}
      onClick={onChoose}
    >
      {isPicking ? (
        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <FolderOpen className="h-4 w-4" aria-hidden />
      )}
      {isPicking ? t('project.choosingDirectory') : t('project.chooseDirectory')}
    </Button>
  )
}

/** 项目目录选择器：无选中时是一个按钮，选中后展示目录并提供「更换目录」 */
export function ProjectDirectoryPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (path: string) => void
}) {
  const picker = useProjectDirectory()
  const hasSelection = value !== ''

  const choose = async (): Promise<void> => {
    const picked = await picker.choose()
    if (picked) {
      onChange(picked.relativePath)
    }
  }
  const handleChoose = (): void => {
    void choose()
  }

  return (
    <div className="min-w-0 flex-1">
      {hasSelection ? (
        <PickedDirectory value={value} directory={picker.directory} onChoose={handleChoose} />
      ) : (
        <PickDirectoryButton isPicking={picker.isPicking} onChoose={handleChoose} />
      )}
      {picker.error ? (
        <p className="mt-1 flex items-start gap-1 text-xs text-app-danger" role="alert">
          <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {errorMessage(picker.error)}
        </p>
      ) : null}
    </div>
  )
}
