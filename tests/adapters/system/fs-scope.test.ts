import { beforeEach, describe, expect, it, vi } from 'vitest'

import { invoke } from '@tauri-apps/api/core'

import { grantProjectDirs } from '@/adapters/system/fs-scope'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

const mockedInvoke = vi.mocked(invoke)

describe('grantProjectDirs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedInvoke.mockResolvedValue(undefined)
  })

  it('调用 allow_project_dirs 命令并透传目录列表', async () => {
    await grantProjectDirs(['/Users/jake/repos/demo', '/Users/jake/repos/other'])

    expect(mockedInvoke).toHaveBeenCalledWith('allow_project_dirs', {
      paths: ['/Users/jake/repos/demo', '/Users/jake/repos/other'],
    })
  })

  it('命令失败时包装为 AppError（E_FS_PERMISSION）', async () => {
    mockedInvoke.mockRejectedValue('scope error')

    await expect(grantProjectDirs(['/Users/jake/repos/demo'])).rejects.toMatchObject({
      code: 'E_FS_PERMISSION',
      message: '授予项目目录文件访问权限失败',
    })
  })

  it('非 Error 的非字符串异常包装为 E_UNKNOWN', async () => {
    mockedInvoke.mockRejectedValue(42)

    await expect(grantProjectDirs(['/Users/jake/repos/demo'])).rejects.toMatchObject({
      code: 'E_UNKNOWN',
    })
  })
})
