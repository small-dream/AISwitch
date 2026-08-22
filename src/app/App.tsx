import { Toaster } from '@/ui/components/Toaster'
import { MainLayout } from '@/ui/layouts/MainLayout'
import { useApplyLocale } from '@/i18n/index'
import { useApplyTheme } from '@/hooks/use-theme'
import { useTrayIntegration } from '@/hooks/use-tray'
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts'
import { ConfigWorkspace } from '@/ui/features/workspace/ConfigWorkspace'
import { useState } from 'react'
import type { AppScope } from '@/types/app-scope'

export function App() {
  const [scope, setScope] = useState<AppScope>('global')
  useApplyTheme()
  useApplyLocale()
  useTrayIntegration()
  useGlobalShortcuts()

  return (
    <MainLayout scope={scope} onScopeChange={setScope}>
      <div className="space-y-6">
        <ConfigWorkspace scope={scope} />
      </div>
      <Toaster />
    </MainLayout>
  )
}
