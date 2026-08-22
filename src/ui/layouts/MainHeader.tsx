import { getVersion } from '@tauri-apps/api/app'
import { Moon, Sparkles, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { AppScope } from '@/types/app-scope'
import { useLocaleStore, useT } from '@/i18n/index'
import { useThemeStore } from '@/stores/theme-store'
import { Badge } from '@/ui/components/Badge'
import { ScopeTabs } from '@/ui/components/ScopeTabs'
import { RestoreButton } from '@/ui/features/restore/RestoreButton'
import { UpdateButton } from '@/ui/features/update/UpdateButton'

function VersionBadge() {
  const [version, setVersion] = useState('')
  useEffect(() => {
    getVersion().then(setVersion).catch(() => { setVersion('') })
  }, [])
  if (version === '') {
    return null
  }
  return <Badge><span className="font-mono">v{version}</span></Badge>
}

export function MainHeader({ scope, onScopeChange }: { scope: AppScope; onScopeChange: (scope: AppScope) => void }) {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const locale = useLocaleStore((state) => state.locale)
  const toggleLocale = useLocaleStore((state) => state.toggleLocale)
  const t = useT()
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-app-border bg-app-bg/80 px-6 py-3.5 backdrop-blur">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-app-accent to-app-accent-hover text-app-accent-text shadow-sm shadow-app-accent/30" aria-hidden>
        <Sparkles className="h-4 w-4" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">AISwitch</h1>
      <VersionBadge />
      <ScopeTabs scope={scope} onChange={onScopeChange} />
      <div className="flex-1" />
      <UpdateButton />
      <RestoreButton />
      <button type="button" aria-label={t('header.toggleLang')} title={t('header.toggleLang')} onClick={toggleLocale} className="flex h-8 w-8 items-center justify-center rounded-lg border border-app-border bg-app-card text-xs font-semibold text-app-muted transition-all duration-150 hover:border-app-border-strong hover:text-app active:scale-95">
        {locale === 'zh-CN' ? 'EN' : '中'}
      </button>
      <button type="button" aria-label={t('header.toggleTheme')} onClick={toggleTheme} className="flex h-8 w-8 items-center justify-center rounded-lg border border-app-border bg-app-card text-app-muted transition-all duration-150 hover:border-app-border-strong hover:text-app active:scale-95">
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  )
}
