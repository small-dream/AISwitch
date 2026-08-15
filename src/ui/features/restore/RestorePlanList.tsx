import type { RestorePlan } from '@/services/restore-service'
import { TOOL_META } from '@/constants/tools'
import { Badge } from '@/ui/components/Badge'
import { RESTORE_ACTION_LABELS } from './restore-labels'

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** 还原计划预览列表：逐文件展示将执行的动作，近似还原如实标注 */
export function RestorePlanList({ plan }: { plan: RestorePlan }) {
  return (
    <ul className="space-y-2">
      {plan.files.map((item) => {
        const meta = RESTORE_ACTION_LABELS[item.action]
        return (
          <li
            key={item.file}
            className="flex items-center justify-between gap-2 rounded-md border border-app-border bg-app-sunken px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-xs text-app">{basename(item.file)}</p>
              <p className="text-[11px] text-app-muted">{TOOL_META[item.tool].label}</p>
            </div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </li>
        )
      })}
    </ul>
  )
}
