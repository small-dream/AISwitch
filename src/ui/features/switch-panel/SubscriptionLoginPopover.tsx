import { CheckCircle2, Copy, ExternalLink, KeyRound } from 'lucide-react'

import { SUBSCRIPTION_LOGIN } from '@/constants/subscription-login'
import type { SubscriptionLoginGuide } from '@/constants/subscription-login'
import type { TargetTool } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import {
  buildCodexLoginCommand,
  buildCodexLoginStatusCommand,
} from '@/domain/rules/subscription-login-command'
import { useCopyCommand } from '@/hooks/use-copy-command'
import { useStartSubscriptionLogin } from '@/hooks/use-start-subscription-login'
import { useT, type TFn, type TranslationKey } from '@/i18n/index'
import { Button } from '@/ui/components/Button'

/** 各工具的登录步骤说明词条（UI 文案归属 i18n，常量表只放命令与文档地址） */
const HINT_KEY = {
  'claude-code': 'subscription.hintClaudeCode',
  codex: 'subscription.hintCodex',
} as const satisfies Record<TargetTool, TranslationKey>

/** 登录态文案：plan/account 有值时附带展示，避免用户核对错账号 */
function statusText(status: SubscriptionAuthStatus, t: TFn): string {
  if (status.state === 'logged-in') {
    const detail = status.plan ?? status.account
    return detail ? t('subscription.loggedInAs', { detail }) : t('subscription.loggedIn')
  }
  return t(status.state === 'logged-out' ? 'subscription.loggedOut' : 'subscription.unknown')
}

/** 命令行：登录命令 + 账号查询 + 一键复制 + 官方文档入口 */
function CommandRow({ command, accountCommand, docUrl }: SubscriptionLoginGuide) {
  const t = useT()
  const { copied, copy } = useCopyCommand(command)

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <code
        title={command}
        className="max-w-full truncate rounded bg-app-input px-1.5 py-0.5 font-mono text-[11px] text-app"
      >
        {command}
      </code>
      <span className="break-all text-app-faint">{accountCommand}</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1 text-app-accent transition-colors hover:text-app"
      >
        <Copy className="h-3 w-3" aria-hidden />
        {t(copied ? 'subscription.copied' : 'subscription.copy')}
      </button>
      <a
        href={docUrl}
        target="_blank"
        rel="noreferrer"
        className="text-app-muted underline-offset-2 transition-colors hover:text-app hover:underline"
      >
        {t('subscription.doc')}
      </a>
    </div>
  )
}

function DirectLoginButton({
  tool,
  state,
}: {
  tool: TargetTool
  state: SubscriptionAuthStatus['state']
}) {
  const t = useT()
  const startLogin = useStartSubscriptionLogin(tool)
  if (tool !== 'codex' || state === 'logged-in') {
    return null
  }
  return (
    <Button
      size="sm"
      className="mt-2"
      disabled={startLogin.isPending}
      onClick={() => {
        startLogin.startLogin()
      }}
    >
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      {t(startLogin.isPending ? 'subscription.startingLogin' : 'subscription.startLogin')}
    </Button>
  )
}

/** 登录引导气泡（PRD §5.13）：常态隐藏，悬停 / 聚焦登录态徽标时展开，标题、状态、命令与文档一处给全 */
export function SubscriptionLoginPopover({
  id,
  tool,
  status,
}: {
  id: string
  tool: TargetTool
  status: SubscriptionAuthStatus
}) {
  const t = useT()
  const guide = SUBSCRIPTION_LOGIN[tool]
  const resolved: SubscriptionLoginGuide =
    tool === 'codex'
      ? {
          ...guide,
          command: buildCodexLoginCommand(status.cliExecutable),
          accountCommand: buildCodexLoginStatusCommand(status.cliExecutable),
        }
      : guide

  return (
    <div
      id={id}
      // pt-1 是热区本身：鼠标从徽标移入气泡时不经过「空白」，气泡才不会中途收起
      className="absolute left-0 top-full z-20 w-80 pt-1"
    >
      <div className="rounded-lg border border-app-border bg-app-card px-3 py-2.5 text-xs shadow-lg shadow-black/[0.08]">
        <div className="flex items-center gap-1.5 font-medium text-app">
          {status.state === 'logged-in' ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-app-ok-text" aria-hidden />
          ) : (
            <KeyRound className="h-3.5 w-3.5 text-app-accent" aria-hidden />
          )}
          {t('subscription.title')}
        </div>
        <p className="mt-1 text-app-muted">{statusText(status, t)}</p>
        <CommandRow {...resolved} />
        <DirectLoginButton tool={tool} state={status.state} />
        <p className="mt-1.5 text-app-faint">{t(HINT_KEY[tool])}</p>
      </div>
    </div>
  )
}
