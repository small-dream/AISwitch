const STACK_ITEMS = [
  'Tauri 2 · Rust 薄壳',
  'React 19 · TypeScript strict',
  'Tailwind CSS v4',
  'Zustand + TanStack Query',
  'Zod · Vitest',
]

export function App() {
  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-3 border-b border-zinc-800/80 px-6 py-4">
        <span className="h-3 w-3 rounded-full bg-indigo-500" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">JakeAITools</h1>
        <span className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
          v0.1.0
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center p-8">
        <section className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/60 p-8">
          <h2 className="text-base font-semibold text-zinc-100">基础环境已就绪</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            下一步：实现 adapters/claude 与 adapters/codex 配置适配器， 以及 switch / detect /
            preset / backup 应用服务。 扩展方式详见 docs/ARCHITECTURE.md。
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {STACK_ITEMS.map((item) => (
              <li
                key={item}
                className="rounded-md border border-zinc-700/70 bg-zinc-800/50 px-2.5 py-1 font-mono text-xs text-zinc-300"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
