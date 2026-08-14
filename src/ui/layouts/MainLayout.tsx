import type { ReactNode } from 'react'

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-3 border-b border-zinc-800/80 px-6 py-4">
        <span className="h-3 w-3 rounded-full bg-indigo-500" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">JakeAITools</h1>
        <span className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
          v0.1.0
        </span>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
