import type { ReactNode } from 'react'

import type { AppScope } from '@/types/app-scope'
import { MainHeader } from './MainHeader'

export function MainLayout({
  children,
  scope,
  onScopeChange,
}: {
  children: ReactNode
  scope: AppScope
  onScopeChange: (scope: AppScope) => void
}) {
  return (
    <div className="flex h-screen flex-col bg-app-bg text-app">
      <MainHeader scope={scope} onScopeChange={onScopeChange} />
      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
