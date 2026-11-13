import { beforeEach, describe, expect, it, vi } from 'vitest'

import { invoke } from '@tauri-apps/api/core'

import { tauriCodexCli } from '@/adapters/codex/cli-status'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

const mockedInvoke = vi.mocked(invoke)

describe('tauriCodexCli.startLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedInvoke.mockResolvedValue(undefined)
  })

  it('调用固定参数窄命令 codex_login', async () => {
    await tauriCodexCli.startLogin()

    expect(mockedInvoke).toHaveBeenCalledWith('codex_login')
  })

  it('启动失败时包装为 AppError', async () => {
    mockedInvoke.mockRejectedValue('Codex CLI not found')

    await expect(tauriCodexCli.startLogin()).rejects.toMatchObject({
      code: 'E_SUBSCRIPTION_LOGIN_START_FAILED',
      message: '无法启动 Codex 登录，请确认 Codex CLI 可用',
    })
  })
})
