import { CheckCircle2, Info, XCircle } from 'lucide-react'

import type { RestoreResult } from '@/services/restore-service'

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** 还原结果列表：逐文件成功/失败如实展示，失败附原因 */
export function RestoreResultList({ result }: { result: RestoreResult }) {
  return (
    <ul className="space-y-2">
      {result.results.map((item) => (
        <li
          key={item.file}
          className="flex items-start gap-2 rounded-md border border-app-border bg-app-sunken px-3 py-2"
        >
          {item.status === 'failed' ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-app-danger" aria-hidden />
          ) : item.status === 'skipped' ? (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-app-muted" aria-hidden />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-ok-text" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-app">{basename(item.file)}</p>
            {item.detail ? <p className="text-[11px] text-app-muted">{item.detail}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
