import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppUpdate } from '@/domain/entities/app-update'
import { UpdateButton } from '@/ui/features/update/UpdateButton'

const state = vi.hoisted(() => ({
  update: null as AppUpdate | null,
  canCheck: true,
  isChecking: false,
  isInstalling: false,
  check: vi.fn(),
  install: vi.fn(),
}))

vi.mock('@/hooks/use-app-update', () => ({
  useAppUpdate: () => state,
}))

describe('UpdateButton', () => {
  beforeEach(() => {
    state.update = null
    state.canCheck = true
    state.isChecking = false
    state.isInstalling = false
    state.check.mockClear()
    state.install.mockClear()
  })

  it('没有已下载的更新时提供手动检查入口', () => {
    render(<UpdateButton />)

    fireEvent.click(screen.getByRole('button', { name: '检查更新' }))

    expect(state.check).toHaveBeenCalledOnce()
  })

  it('检查或下载期间禁用检查按钮', () => {
    state.isChecking = true
    render(<UpdateButton />)

    expect(screen.getByRole('button', { name: '检查更新中…' })).toBeDisabled()
  })

  it('更新下载完成后切换为安装按钮', () => {
    state.update = { currentVersion: '0.1.13', version: '0.1.14' }
    render(<UpdateButton />)

    fireEvent.click(screen.getByRole('button', { name: '更新到 v0.1.14' }))

    expect(state.install).toHaveBeenCalledOnce()
  })
})
