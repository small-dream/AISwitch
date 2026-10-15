import clsx from 'clsx'
import { CheckCircle2 } from 'lucide-react'

import type { Preset, TargetTool } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { isSubscriptionActive } from '@/domain/rules/subscription-active'
import { useT, type TranslationKey } from '@/i18n/index'
import { useSubscriptionAuth } from '@/hooks/use-subscription-auth'
import { useClearManaged } from '@/hooks/use-switch'
import { useToolStatus } from '@/hooks/use-tool-status'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'
import { Badge } from '@/ui/components/Badge'
import { Button } from '@/ui/components/Button'

type BadgeTone = 'default' | 'success' | 'warning'

const LOGIN_BADGE: Record<
  SubscriptionAuthStatus['state'],
  { key: TranslationKey; tone: BadgeTone }
> = {
  'logged-in': { key: 'subscriptionPreset.loggedIn', tone: 'success' },
  'logged-out': { key: 'subscriptionPreset.loggedOut', tone: 'warning' },
  unknown: { key: 'subscriptionPreset.unknown', tone: 'default' },
}

/** 信息列：名称 + 登录态 + 生效标记 + 语义说明（订阅不写模型，故不展示模型名） */
function SubscriptionRowInfo({
  auth,
  isActive,
}: {
  auth: SubscriptionAuthStatus | undefined
  isActive: boolean
}) {
  const t = useT()
  const login = auth ? LOGIN_BADGE[auth.state] : undefined
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="truncate font-medium">{t('subscriptionPreset.name')}</span>
        {login ? <Badge tone={login.tone}>{t(login.key)}</Badge> : null}
        {isActive ? (
          <Badge tone="success">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            {t('presetRow.active')}
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-app-muted">{t('subscriptionPreset.description')}</p>
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
  const t = useT()
  const { data: auth } = useSubscriptionAuth(tool)
  const { data: statuses } = useToolStatus()
  const clearMutation = useClearManaged()
  const status = (statuses ?? []).find((item) => item.tool === tool)
  const isActive = isSubscriptionActive(status, presets)

  const apply = () => {
    clearMutation.mutate(tool, {
      onSuccess: () => {
        toastSuccess(t('presetRow.switchedTo', { name: t('subscriptionPreset.name') }))
      },
      onError: (error) => {
        toastError(errorMessage(error))
      },
    })
  }

  return (
    <li
      className={clsx(
        'animate-fade-in rounded-lg border border-dashed p-3 transition-colors duration-150',
        isActive
          ? 'border-app-accent/60 bg-app-accent-soft/60 shadow-sm shadow-app-accent/10'
          : 'border-app-border bg-app-sunken hover:border-app-accent/40 hover:bg-app-hover'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <SubscriptionRowInfo auth={auth} isActive={isActive} />
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" disabled={clearMutation.isPending} onClick={apply}>
            {clearMutation.isPending ? t('presetRow.applying') : t('subscriptionPreset.switch')}
          </Button>
        </div>
      </div>
    </li>
  )
}
