import { Moon, Sparkles, Sun } from 'lucide-react'
import type { ReactNode } from 'react'

import { useThemeStore } from '@/stores/theme-store'
import { Badge } from '@/ui/components/Badge'

export function MainLayout({ children }: { children: ReactNode }) {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return (
    <div className="flex h-screen flex-col bg-app-bg text-app">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-app-border bg-app-bg/80 px-6 py-3.5 backdrop-blur">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-app-accent to-app-accent-hover text-app-accent-text shadow-sm shadow-app-accent/30"
          aria-hidden
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <h1 className="text-lg font-semibold tracking-tight">AISwitch</h1>
        <Badge>
          <span className="font-mono">v0.1.0</span>
        </Badge>
        <div className="flex-1" />
        <button
          type="button"
          aria-label="切换主题"
          onClick={() => {
            toggleTheme()
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-app-border bg-app-card text-app-muted transition-all duration-150 hover:border-app-border-strong hover:text-app active:scale-95"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
