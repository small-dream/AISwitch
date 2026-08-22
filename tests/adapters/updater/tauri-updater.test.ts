import { beforeEach, describe, expect, it, vi } from 'vitest'

import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

import { createTauriUpdater } from '@/adapters/updater/tauri-updater'

vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }))

const mockedCheck = vi.mocked(check)
const mockedRelaunch = vi.mocked(relaunch)

function makeUpdate() {
  const download = vi.fn(() => Promise.resolve())
  const install = vi.fn(() => Promise.resolve())
  const update = {
    currentVersion: '0.1.7',
    version: '0.1.8',
    date: '2026-08-22T00:00:00Z',
    body: 'Fix update flow',
    download,
    install,
  } as unknown as Update
  return { update, download, install }
}

describe('createTauriUpdater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRelaunch.mockResolvedValue(undefined)
  })

  it('maps update metadata and downloads the pending update', async () => {
    const { update, download } = makeUpdate()
    mockedCheck.mockResolvedValue(update)
    const adapter = createTauriUpdater()

    await expect(adapter.check()).resolves.toEqual({
      currentVersion: '0.1.7',
      version: '0.1.8',
      date: '2026-08-22T00:00:00Z',
      body: 'Fix update flow',
    })
    await adapter.download()

    expect(download).toHaveBeenCalledOnce()
  })

  it('installs the downloaded update and relaunches the app', async () => {
    const { update, install } = makeUpdate()
    mockedCheck.mockResolvedValue(update)
    const adapter = createTauriUpdater()
    await adapter.check()
    await adapter.download()

    await adapter.install()

    expect(install).toHaveBeenCalledOnce()
    expect(mockedRelaunch).toHaveBeenCalledOnce()
  })

  it('rejects download when no update is pending', async () => {
    mockedCheck.mockResolvedValue(null)
    const adapter = createTauriUpdater()
    await adapter.check()

    await expect(adapter.download()).rejects.toMatchObject({ code: 'E_UPDATE_DOWNLOAD' })
  })
})
