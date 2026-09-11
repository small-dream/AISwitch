import { invoke } from '@tauri-apps/api/core'

import { toAppError } from '@/domain/errors'

/**
 * 为已选定的项目目录授予本会话 fs 递归访问范围（Rust 命令 allow_project_dirs）。
 * 目录选择成功后与启动时历史记录重授权共用；scope 不持久化，随进程退出清空。
 */
export async function grantProjectDirs(paths: readonly string[]): Promise<void> {
  try {
    await invoke('allow_project_dirs', { paths: [...paths] })
  } catch (error) {
    throw toAppError(error, 'E_FS_PERMISSION', '授予项目目录文件访问权限失败', { paths })
  }
}
