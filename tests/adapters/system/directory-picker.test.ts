import { beforeEach, describe, expect, it, vi } from 'vitest'

import { invoke } from '@tauri-apps/api/core'
import { homeDir } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/plugin-dialog'

import { pickProjectDirectory, relativeToHome } from '@/adapters/system/directory-picker'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/path', () => ({ homeDir: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))

const mockedInvoke = vi.mocked(invoke)
const mockedHomeDir = vi.mocked(homeDir)
const mockedOpen = vi.mocked(open)

describe('directory picker path mapping', () => {
  it('将主目录下的绝对路径转换为相对路径', () => {
    expect(relativeToHome('/Users/jake/repos/demo', '/Users/jake')).toBe('repos/demo')
    expect(relativeToHome('C:\\Users\\jake\\repos\\demo', 'C:\\Users\\jake')).toBe('repos/demo')
  })

  it('拒绝主目录本身和主目录之外的路径', () => {
    expect(() => relativeToHome('/Users/jake', '/Users/jake')).toThrow('具体的项目目录')
    expect(() => relativeToHome('/tmp/demo', '/Users/jake')).toThrow('用户主目录下')
  })
})

describe('pickProjectDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedHomeDir.mockResolvedValue('/Users/jake')
    mockedInvoke.mockResolvedValue(undefined)
    mockedOpen.mockResolvedValue('/Users/jake/repos/demo')
  })

  it('选择成功后以所选路径授予项目目录 fs 访问范围', async () => {
    const picked = await pickProjectDirectory()

    expect(mockedInvoke).toHaveBeenCalledWith('allow_project_dirs', {
      paths: ['/Users/jake/repos/demo'],
    })
    expect(picked).toEqual({
      absolutePath: '/Users/jake/repos/demo',
      relativePath: 'repos/demo',
      name: 'demo',
    })
  })

  it('授权失败时视为选择失败并抛出 AppError', async () => {
    mockedInvoke.mockRejectedValue('scope error')

    await expect(pickProjectDirectory()).rejects.toMatchObject({ code: 'E_FS_PERMISSION' })
  })

  it('用户取消选择时不授权并返回 null', async () => {
    mockedOpen.mockResolvedValue(null)

    await expect(pickProjectDirectory()).resolves.toBeNull()
    expect(mockedInvoke).not.toHaveBeenCalled()
  })
})
