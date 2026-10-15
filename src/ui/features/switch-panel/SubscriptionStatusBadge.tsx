import { useState } from 'react'
import type { FocusEvent } from 'react'

import type { TargetTool } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { useT, type TranslationKey } from '@/i18n/index'
import { Badge } from '@/ui/components/Badge'
import { SubscriptionLoginPopover } from './SubscriptionLoginPopover'

type BadgeTone = 'default' | 'success' | 'warning'

const LOGIN_BADGE: Record<
  SubscriptionAuthStatus['state'],
  { key: TranslationKey; tone: BadgeTone }
> = {
  'logged-in': { key: 'subscriptionPreset.loggedIn', tone: 'success' },
  'logged-out': { key: 'subscriptionPreset.loggedOut', tone: 'warning' },
  unknown: { key: 'subscriptionPreset.unknown', tone: 'default' },
}

const POPOVER_ID = 'subscription-login-hint'

/**
 * 登录态徽标（PRD §5.13）：列表行内只占一枚小徽标，把登录命令、文档与说明
 * 收进悬停 / 聚焦时展开的气泡，常态不占版面。
 */
export function SubscriptionStatusBadge({
  tool,
  status,
}: {
  tool: TargetTool
  status: SubscriptionAuthStatus
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const login = LOGIN_BADGE[status.state]
  const show = () => {
    setOpen(true)
  }
  const hide = () => {
    setOpen(false)
  }
  /** 焦点仍在气泡内（例如点「复制命令」）时保持展开，只有真正离开才收起 */
  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return
    }
    hide()
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onBlur={handleBlur}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? POPOVER_ID : undefined}
        onFocus={show}
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/50"
      >
        <Badge tone={login.tone}>{t(login.key)}</Badge>
      </button>
      {open ? <SubscriptionLoginPopover id={POPOVER_ID} tool={tool} status={status} /> : null}
    </span>
  )
}
