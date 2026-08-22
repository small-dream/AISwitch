import { Toaster } from '@/ui/components/Toaster'
import { StatusCards } from '@/ui/features/status-cards/StatusCards'
import { SwitchPanel } from '@/ui/features/switch-panel/SwitchPanel'
import { BundlePanel } from '@/ui/features/bundles/BundlePanel'
import { MainLayout } from '@/ui/layouts/MainLayout'
import { useApplyLocale } from '@/i18n/index'
import { useApplyTheme } from '@/hooks/use-theme'
import { useTrayIntegration } from '@/hooks/use-tray'

export function App() {
  useApplyTheme()
  useApplyLocale()
  useTrayIntegration()

  return (
    <MainLayout>
      <div className="space-y-6">
        <StatusCards />
        <SwitchPanel />
        <BundlePanel />
      </div>
      <Toaster />
    </MainLayout>
  )
}
