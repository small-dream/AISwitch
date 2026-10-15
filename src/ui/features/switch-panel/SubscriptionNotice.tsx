import { CheckCircle2, Copy, KeyRound, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { SUBSCRIPTION_LOGIN } from '@/constants/subscription-login'
import type { TargetTool } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { isSubscriptionAuth } from '@/domain/rules/auth-mode'
import { useT, type TFn, type TranslationKey } from '@/i18n/index'
import { usePresets } from '@/hooks/use-presets'
import { useSubscriptionAuth } from '@/hooks/use-subscription-auth'

/** 各工具的登录步骤说明词条（UI 文案归属 i18n，常量表只放命令与文档地址） */
const HINT_KEY = {
  'claude-code': 'subscription.hintClaudeCode',
  codex: 'subscription.hintCodex',
} as const satisfies Record<TargetTool, TranslationKey>

/** 登录态文案：plan/account 有值时附带展示，避免用户核对错账号 */
function statusText(status: SubscriptionAuthStatus | undefined, t: TFn): string {
  if (!status) {
    return t('subscription.checking')
  }
  if (status.state === 'logged-in') {
    const detail = status.plan ?? status.account
    return detail ? t('subscription.loggedInAs', { detail }) : t('subscription.loggedIn')
  }
  return t(status.state === 'logged-out' ? 'subscription.loggedOut' : 'subscription.unknown')
}

/** 复制终端登录命令：仅成功时给反馈，失败时命令本身已可手动复制 */
function useCopyCommand(command: string) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) {
      return undefined
    }
    const timer = setTimeout(() => {
      setCopied(false)
    }, 2000)
    return () => {
      clearTimeout(timer)
    }
  }, [copied])
  const copy = () => {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        setCopied(true)
      })
      .catch(() => {
        setCopied(false)
      })
  }
  return { copied, copy }
}

/** 官方订阅登录提示（PRD §5.13）：仅当该工具存在订阅预设时出现，指引用户在 CLI 内完成登录 */
export function SubscriptionNotice({ tool }: { tool: TargetTool }) {
  const t = useT()
  const { data: presets } = usePresets()
  const { data: status } = useSubscriptionAuth(tool)
  const guide = SUBSCRIPTION_LOGIN[tool]
  const { copied, copy } = useCopyCommand(guide.command)

  const hasSubscriptionPreset = (presets ?? []).some(
    (preset) => preset.tool === tool && isSubscriptionAuth(preset)
  )
  if (!hasSubscriptionPreset) {
    return null
  }

  return (
    <div className="mb-4 rounded-lg border border-app-border bg-app-sunken px-3 py-2.5 text-xs">
      <div className="flex items-center gap-1.5 font-medium text-app">
        {status?.state === 'logged-in' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-app-ok-text" aria-hidden />
        ) : (
          <KeyRound className="h-3.5 w-3.5 text-app-accent" aria-hidden />
        )}
        {t('subscription.title')}
        {status === undefined ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
      </div>
      <p className="mt-1 text-app-muted">{statusText(status, t)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded bg-app-input px-1.5 py-0.5 font-mono text-[11px] text-app">
          {guide.command}
        </code>
        <span className="text-app-faint">{guide.accountCommand}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-app-accent transition-colors hover:text-app"
        >
          <Copy className="h-3 w-3" aria-hidden />
          {t(copied ? 'subscription.copied' : 'subscription.copy')}
        </button>
        <a
          href={guide.docUrl}
          target="_blank"
          rel="noreferrer"
          className="text-app-muted underline-offset-2 transition-colors hover:text-app hover:underline"
        >
          {t('subscription.doc')}
        </a>
      </div>
      <p className="mt-1.5 text-app-faint">{t(HINT_KEY[tool])}</p>
    </div>
  )
}
