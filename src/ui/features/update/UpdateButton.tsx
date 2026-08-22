import { Download, RefreshCw } from 'lucide-react'

import { useT } from '@/i18n/index'
import { useAppUpdate } from '@/hooks/use-app-update'
import { Button } from '@/ui/components/Button'

/** 顶栏更新入口：手动检查并预下载，下载完成后切换为安装操作。 */
export function UpdateButton() {
  const t = useT()
  const { update, canCheck, isChecking, isInstalling, check, install } = useAppUpdate()
  if (!canCheck) {
    return null
  }

  if (!update) {
    const label = isChecking ? t('update.checking') : t('update.check')
    return (
      <Button
        variant="secondary"
        size="sm"
        aria-label={label}
        title={t('update.checkHint')}
        onClick={check}
        disabled={isChecking}
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        {label}
      </Button>
    )
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
