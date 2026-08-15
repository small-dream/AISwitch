import { describe, expect, it } from 'vitest'

import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import type { FileSystemPort } from '@/types/fs-port'
import { createMemoryFs, type MemoryFs } from '../../helpers/memory-fs'

/** 包装内存替身：指定路径上的 restrictPermissions 抛错，用于故障注入 */
function failRestrictOn(failPath: string): { fs: MemoryFs; base: MemoryFs } {
  const base = createMemoryFs()
  const fs: MemoryFs = {
    ...base,
    async restrictPermissions(path) {
      if (path === failPath) {
        throw new Error('EACCES: operation not permitted')
      }
      return base.restrictPermissions(path)
    },
  }
  return { fs, base }
}

describe('writeTextAtomic', () => {
  it('成功路径：tmp 与目标文件均被收紧权限，且不残留 tmp', async () => {
    const fs = createMemoryFs()

    await writeTextAtomic(fs, '.aiswitch/presets.json', '{}')

    expect(fs.restricted()).toEqual([
      '.aiswitch/presets.json.jake-tmp',
      '.aiswitch/presets.json',
    ])
    expect(fs.files().has('.aiswitch/presets.json.jake-tmp')).toBe(false)
    expect(fs.files().get('.aiswitch/presets.json')).toBe('{}')
  })

  it('写入 tmp 失败：抛 E_FS_WRITE 且不留 tmp', async () => {
    const fs = createMemoryFs()
    const failing: FileSystemPort = {
      ...fs,
      async writeTextFile(path, contents) {
        if (path.endsWith('.jake-tmp')) {
          throw new Error('disk full')
        }
        return fs.writeTextFile(path, contents)
      },
    }

    await expect(writeTextAtomic(failing, '.aiswitch/presets.json', '{}')).rejects.toMatchObject({
      code: 'E_FS_WRITE',
    })
    expect(fs.files().has('.aiswitch/presets.json.jake-tmp')).toBe(false)
  })

  it('tmp 权限收紧失败：抛 E_FS_PERMISSION（不降级为 E_FS_WRITE）并清理 tmp', async () => {
    const { fs } = failRestrictOn('.aiswitch/presets.json.jake-tmp')

    await expect(writeTextAtomic(fs, '.aiswitch/presets.json', '{}')).rejects.toMatchObject({
      code: 'E_FS_PERMISSION',
    })
    expect(fs.files().has('.aiswitch/presets.json.jake-tmp')).toBe(false)
  })

  it('rename 后目标收紧失败：抛 E_FS_PERMISSION，已写入的目标内容保留', async () => {
    const { fs } = failRestrictOn('.aiswitch/presets.json')

    await expect(writeTextAtomic(fs, '.aiswitch/presets.json', '{}')).rejects.toMatchObject({
      code: 'E_FS_PERMISSION',
    })
    // 目标已被 rename 写入，内容不回滚（由上层 backup/rollback 链路负责恢复）
    expect(fs.files().get('.aiswitch/presets.json')).toBe('{}')
  })
})
