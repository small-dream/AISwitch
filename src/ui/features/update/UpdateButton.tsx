import { Download } from 'lucide-react'

import { useT } from '@/i18n/index'
import { useAppUpdate } from '@/hooks/use-app-update'
import { Button } from '@/ui/components/Button'

/** 顶栏更新入口：仅在新版本已预下载完成后显示。 */
export function UpdateButton() {
  const t = useT()
  const { update, isInstalling, install } = useAppUpdate()
  if (!update) {
    return null
  }
  const label = isInstalling
    ? t('update.installing')
    : t('update.available', { version: update.version })
  return (
    <Button
      size="sm"
      aria-label={label}
      title={t('update.ready')}
      onClick={() => {
        install()
      }}
      disabled={isInstalling}
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Button>
  )
}
