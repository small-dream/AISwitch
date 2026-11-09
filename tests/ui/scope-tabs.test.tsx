import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ScopeTabs } from '@/ui/components/ScopeTabs'

describe('ScopeTabs', () => {
  it('显示全局与项目作用域，并切换选中态', () => {
    let scope: 'global' | 'project' = 'global'
    const rerender = render(
      <ScopeTabs
        scope={scope}
        onChange={(next) => {
          scope = next
          rerender.rerender(
            <ScopeTabs
              scope={scope}
              onChange={(value) => {
                scope = value
              }}
            />
          )
        }}
      />
    )

    expect(screen.getByRole('tab', { name: '全局' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: '项目' }))
    expect(screen.getByRole('tab', { name: '项目' })).toHaveAttribute('aria-selected', 'true')
  })

  it('键盘方向键可在页签间切换（未选中页签 tabIndex=-1）', () => {
    const changes: string[] = []
    render(
      <ScopeTabs
        scope="global"
        onChange={(next) => {
          changes.push(next)
        }}
      />
    )
    const tablist = screen.getByRole('tablist')

    fireEvent.keyDown(tablist, { key: 'ArrowRight' })
    expect(changes).toEqual(['project'])

    fireEvent.keyDown(tablist, { key: 'ArrowLeft' })
    expect(changes).toEqual(['project', 'project'])

    fireEvent.keyDown(tablist, { key: 'Enter' })
    expect(changes).toHaveLength(2)
  })
})
