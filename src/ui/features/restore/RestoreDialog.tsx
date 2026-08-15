import { AlertTriangle, RotateCcw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { useExecuteRestore, useRestorePlan } from '@/hooks/use-restore'
import type { RestoreResult } from '@/services/restore-service'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'
import { Button } from '@/ui/components/Button'
import { Input } from '@/ui/components/Input'
import { RestorePlanList } from './RestorePlanList'
import { RestoreResultList } from './RestoreResultList'

type Step = 'preview' | 'confirm' | 'result'

/** 三步状态机 + 执行通知（执行结果经 toast 与结果列表双通道反馈） */
function useRestoreFlow() {
  const [step, setStep] = useState<Step>('preview')
  const [result, setResult] = useState<RestoreResult | null>(null)
  const execute = useExecuteRestore()

  const handleExecute = () => {
    execute.mutate(undefined, {
      onSuccess: (restoreResult) => {
        setResult(restoreResult)
        setStep('result')
        if (restoreResult.allSucceeded) {
          toastSuccess('已还原到安装 AISwitch 之前的状态')
        } else {
          toastError('部分文件未能还原，请在结果中查看详情')
        }
      },
      onError: (error) => {
        toastError(errorMessage(error))
      },
    })
  }

  return {
    step,
    result,
    toPreview: () => {
      setStep('preview')
    },
    toConfirm: () => {
      setStep('confirm')
    },
    handleExecute,
    pending: execute.isPending,
  }
}

/** 一键还原弹窗（US-一键还原）：预览 → 输入确认 → 执行结果，三步状态机 */
export function RestoreDialog({ onClose }: { onClose: () => void }) {
  const flow = useRestoreFlow()
  return (
    <div
      className="animate-overlay-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-dialog-in flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <RotateCcw className="h-4 w-4 text-app-danger" aria-hidden />
          一键还原到安装前
        </h2>
        {flow.step === 'preview' ? <PreviewStep onNext={flow.toConfirm} onClose={onClose} /> : null}
        {flow.step === 'confirm' ? (
          <ConfirmStep
            onBack={flow.toPreview}
            onConfirm={flow.handleExecute}
            pending={flow.pending}
          />
        ) : null}
        {flow.step === 'result' && flow.result ? (
          <ResultStep result={flow.result} onClose={onClose} />
        ) : null}
      </div>
    </div>
  )
}

function WarningBanner() {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-app-danger-border bg-app-danger-bg/50 p-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-app-danger-text" aria-hidden />
      <p className="text-xs leading-relaxed text-app-danger-text">
        将把 Claude Code 与 Codex CLI 的配置恢复到安装 AISwitch
        之前的状态，操作不可撤销。你的预设、密钥与备份会保留在 ~/.aiswitch 中，不受影响。
      </p>
    </div>
  )
}

function PreviewStep({ onNext, onClose }: { onNext: () => void; onClose: () => void }) {
  const { data: plan, isLoading, isError, error } = useRestorePlan(true)
  const hasActionable = plan?.files.some((item) => item.action !== 'keep') ?? false
  return (
    <>
      <WarningBanner />
      {isLoading ? (
        <p className="py-6 text-center text-sm text-app-muted">正在分析配置…</p>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-app-danger-text">{errorMessage(error)}</p>
      ) : plan ? (
        <>
          <p
            className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              plan.hasBaseline
                ? 'border-app-ok-border bg-app-ok-bg/40 text-app-ok-text'
                : 'border-app-warn-border bg-app-warn-bg/40 text-app-warn-text'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {plan.hasBaseline
              ? '已检测到安装前基线，可精确还原'
              : '未检测到安装前基线，将尽力近似还原'}
          </p>
          {hasActionable ? (
            <RestorePlanList plan={plan} />
          ) : (
            <p className="py-6 text-center text-sm text-app-muted">
              没有需要还原的配置，你的工具配置已是未安装 AISwitch 时的状态。
            </p>
          )}
        </>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button size="sm" disabled={!plan || !hasActionable} onClick={onNext}>
          下一步
        </Button>
      </div>
    </>
  )
}

/** 输入「还原」二段确认：不可逆且改写磁盘配置，强度须高于两段式点击 */
function ConfirmStep({
  onBack,
  onConfirm,
  pending,
}: {
  onBack: () => void
  onConfirm: () => void
  pending: boolean
}) {
  const [text, setText] = useState('')
  return (
    <>
      <WarningBanner />
      <p className="mb-2 text-xs text-app-muted">
        请输入 <span className="font-semibold text-app">还原</span> 以确认执行：
      </p>
      <Input
        value={text}
        onChange={(event) => {
          setText(event.target.value)
        }}
        placeholder="还原"
        autoComplete="off"
        aria-label="输入还原以确认"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onBack}>
          返回
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={text !== '还原' || pending}
          onClick={onConfirm}
        >
          {pending ? '正在还原…' : '确认还原'}
        </Button>
      </div>
    </>
  )
}

function ResultStep({ result, onClose }: { result: RestoreResult; onClose: () => void }) {
  return (
    <>
      <p className="mb-3 text-sm text-app">
        {result.allSucceeded
          ? '已还原到安装 AISwitch 之前的状态。'
          : '部分文件未能还原，详情如下：'}
      </p>
      <RestoreResultList result={result} />
      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="secondary" onClick={onClose}>
          关闭
        </Button>
      </div>
    </>
  )
}
