import { toAppError } from '@/domain/errors'
import type { FileSystemPort } from '@/types/fs-port'

/**
 * 原子写：先写临时文件再 rename 覆盖（写入三段式的写阶段，ARCHITECTURE §2.3 D4）。
 * Rust 侧 std::fs::rename 在 Windows 上会替换已存在目标，保证目标文件不会写一半损坏。
 * 安全不变式：tmp 与目标文件在可见窗口内均被收紧到 0600，任何一步失败都清理残留 tmp，
 * 保证含密钥内容不会以宽松权限（umask 默认 0644）留在磁盘上。
 */
export async function writeTextAtomic(
  fs: FileSystemPort,
  path: string,
  contents: string
): Promise<void> {
  const tmp = `${path}.jake-tmp`
  try {
    await fs.writeTextFile(tmp, contents)
    await restrict(fs, tmp)
    await fs.rename(tmp, path)
    // rename 继承 tmp 的 0600，此处幂等兜底（也收紧历史已存在的过宽目标）
    await restrict(fs, path)
  } catch (error) {
    // rename 成功后 tmp 已不存在；exists 守卫避免清理逻辑误伤
    if (await fs.exists(tmp)) {
      await fs.remove(tmp).catch(() => undefined)
    }
    throw toAppError(error, 'E_FS_WRITE', '写入文件失败', { path })
  }
}

async function restrict(fs: FileSystemPort, path: string): Promise<void> {
  try {
    await fs.restrictPermissions(path)
  } catch (error) {
    // 权限收紧失败是独立故障，不得降级为普通写失败
    throw toAppError(error, 'E_FS_PERMISSION', '文件权限收紧失败', { path })
  }
}
