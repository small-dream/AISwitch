import clsx from 'clsx'
import type { KeyboardEvent } from 'react'

import type { AppScope } from '@/types/app-scope'
import { useT } from '@/i18n/index'
import { appScopes, nextScope } from './scope-tabs.utils'

export function ScopeTabs({
  scope,
  onChange,
}: {
  scope: AppScope
  onChange: (scope: AppScope) => void
}) {
  const t = useT()
  /** 未选中页签 tabIndex=-1，键盘用户只能靠方向键在 tablist 内切换 */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextScope(scope, event.key)
    if (!next) {
      return
    }
    event.preventDefault()
    onChange(next)
  }

  return (
    <div
      className="flex shrink-0 items-center rounded-lg border border-app-border bg-app-sunken p-0.5"
      role="tablist"
      aria-label={t('scope.label')}
      onKeyDown={handleKeyDown}
    >
      {appScopes.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={scope === tab}
          tabIndex={scope === tab ? 0 : -1}
          onClick={() => {
            onChange(tab)
          }}
          className={clsx(
            'h-7 rounded-md px-3 text-xs font-medium transition-colors duration-150',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-accent',
            scope === tab ? 'bg-app-tab-active text-app shadow-sm' : 'text-app-muted hover:text-app'
          )}
        >
          {t(`scope.${tab}`)}
        </button>
      ))}
    </div>
  )
}
