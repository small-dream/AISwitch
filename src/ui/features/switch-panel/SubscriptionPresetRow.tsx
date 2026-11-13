import clsx from 'clsx'
import { CheckCircle2 } from 'lucide-react'

import type { Preset, TargetTool } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { buildCodexLoginCommand } from '@/domain/rules/subscription-login-command'
import { isSubscriptionActive } from '@/domain/rules/subscription-active'
import { useT } from '@/i18n/index'
import { useSubscriptionAuth } from '@/hooks/use-subscription-auth'
import { useSubscriptionSwitchGuard } from '@/hooks/use-subscription-switch-guard'
import { useToolStatus } from '@/hooks/use-tool-status'
import { Badge } from '@/ui/components/Badge'
import { Button } from '@/ui/components/Button'
import { SubscriptionGuides } from './SubscriptionGuides'
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge'

/**
 * 信息列：名称 + 登录态徽标 + 生效标记 + 语义说明（订阅不写模型，故不展示模型名）。
 * 登录命令等细节收进徽标气泡，常态只留一枚徽标。
 */
function SubscriptionRowInfo({
  tool,
  auth,
  isActive,
}: {
  tool: TargetTool
  auth: SubscriptionAuthStatus | undefined
  isActive: boolean
}) {
  const t = useT()
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="truncate font-medium">{t('subscriptionPreset.name')}</span>
        {auth ? <SubscriptionStatusBadge tool={tool} status={auth} /> : null}
        {isActive ? (
          <Badge tone="success">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            {t('presetRow.active')}
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-app-muted">{t('subscriptionPreset.description')}</p>
      {tool === 'codex' && auth && auth.state !== 'logged-in' ? (
        <p className="mt-1 text-xs text-app-warn-text">
          {t(
            auth.state === 'unknown'
              ? 'subscriptionPreset.loginUnknown'
              : 'subscriptionPreset.loginRequired'
          )}
        </p>
      ) : null}
    </div>
  )
}

function SubscriptionRowAction({ pending, onApply }: { pending: boolean; onApply: () => void }) {
  const t = useT()
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" disabled={pending} onClick={onApply}>
        {pending ? t('presetRow.applying') : t('subscriptionPreset.switch')}
      </Button>
    </div>
  )
}

/**
 * 内建「官方订阅」条目（PRD §5.13）：每个工具一个、零字段、不落盘，
 * 一键把该工具的托管键全部交回 CLI 自身（鉴权走登录态，模型由 CLI 自选）。
 */
export function SubscriptionPresetRow({
  tool,
  presets,
}: {
  tool: TargetTool
  presets: readonly Preset[]
}) {
  const { data: auth } = useSubscriptionAuth(tool)
  const { data: statuses } = useToolStatus()
  const { gate, successGuide, pending, apply, retry, confirmConflict, close, closeSuccessGuide } =
    useSubscriptionSwitchGuard(tool)
  const status = (statuses ?? []).find((item) => item.tool === tool)
  const isActive = isSubscriptionActive(status, presets)
  const loginCommand = tool === 'codex' ? buildCodexLoginCommand(auth?.cliExecutable) : undefined

  return (
    <>
      <li
        className={clsx(
          'animate-fade-in rounded-lg border border-dashed p-3 transition-colors duration-150',
          isActive
            ? 'border-app-accent/60 bg-app-accent-soft/60 shadow-sm shadow-app-accent/10'
            : 'border-app-border bg-app-sunken hover:border-app-accent/40 hover:bg-app-hover'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <SubscriptionRowInfo tool={tool} auth={auth} isActive={isActive} />
          <SubscriptionRowAction pending={pending} onApply={apply} />
        </div>
      </li>
      <SubscriptionGuides
        tool={tool}
        gate={gate}
        successGuide={successGuide}
        pending={pending}
        loginCommand={loginCommand}
        onRetry={retry}
        onConfirmConflict={confirmConflict}
        onClose={close}
        onCloseSuccess={closeSuccessGuide}
      />
    </>
  )
}
