import { toAppError } from '@/domain/errors'
import type { FileSystemPort } from '@/types/fs-port'

/**
 * 原子写：先写临时文件再 rename 覆盖（写入三段式的写阶段，ARCHITECTURE §2.3 D4）。
 * Rust 侧 std::fs::rename 在 Windows 上会替换已存在目标，保证目标文件不会写一半损坏。
 */
export async function writeTextAtomic(
  fs: FileSystemPort,
  path: string,
  contents: string
): Promise<void> {
  const tmp = `${path}.jake-tmp`
  try {
    await fs.writeTextFile(tmp, contents)
    await fs.rename(tmp, path)
  } catch (error) {
    throw toAppError(error, 'E_FS_WRITE', '写入文件失败', { path })
  }
}
