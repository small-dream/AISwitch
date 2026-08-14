import type { ReactNode } from 'react'

import { useThemeStore } from '@/stores/theme-store'
import { Button } from '@/ui/components/Button'

export function MainLayout({ children }: { children: ReactNode }) {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return (
    <div className="flex h-screen flex-col bg-app-bg text-app">
      <header className="flex items-center gap-3 border-b border-app-border px-6 py-4">
        <span className="h-3 w-3 rounded-full bg-indigo-500" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">JakeAITools</h1>
        <span className="rounded border border-app-border-strong px-1.5 py-0.5 font-mono text-xs text-app-muted">
          v0.1.0
        </span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="secondary"
          aria-label="切换主题"
          onClick={() => {
            toggleTheme()
          }}
        >
          {theme === 'dark' ? '☀️ 亮色' : '🌙 暗色'}
        </Button>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
