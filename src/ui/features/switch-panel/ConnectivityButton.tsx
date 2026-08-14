import clsx from 'clsx'

import type { ConnectivityStatus } from '@/domain/entities/connectivity'
import type { Preset } from '@/domain/entities/preset'
import { useConnectivityTest } from '@/hooks/use-connectivity-test'
import { Button } from '@/ui/components/Button'

const RESULT_META: Record<ConnectivityStatus, { text: string; className: string }> = {
  ok: { text: '', className: 'text-app-ok-text' },
  'invalid-key': { text: 'Key 无效', className: 'text-app-danger-text' },
  unreachable: { text: '无法连通', className: 'text-app-warn-text' },
  unsupported: { text: '不支持探测', className: 'text-app-faint' },
}

/** 连通性测试按钮 + 内联结果（US-06） */
export function ConnectivityButton({ preset }: { preset: Preset }) {
  const test = useConnectivityTest()
  const result = test.data
  const meta = result ? RESULT_META[result.status] : null
  const label =
    result?.status === 'ok' ? `✓ ${String(result.latencyMs ?? '-')}ms` : (meta?.text ?? null)

  return (
    <span className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="secondary"
        disabled={test.isPending}
        onClick={() => {
          test.mutate(preset)
        }}
      >
        {test.isPending ? '测试中…' : '测试'}
      </Button>
      {label && meta ? <span className={clsx('text-[11px]', meta.className)}>{label}</span> : null}
    </span>
  )
}
