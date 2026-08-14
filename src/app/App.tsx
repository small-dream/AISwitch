import { Toaster } from '@/ui/components/Toaster'
import { StatusCards } from '@/ui/features/status-cards/StatusCards'
import { SwitchPanel } from '@/ui/features/switch-panel/SwitchPanel'
import { MainLayout } from '@/ui/layouts/MainLayout'
import { useTrayIntegration } from '@/hooks/use-tray'

export function App() {
  useTrayIntegration()

  return (
    <MainLayout>
      <div className="space-y-6">
        <StatusCards />
        <SwitchPanel />
      </div>
      <Toaster />
    </MainLayout>
  )
}
