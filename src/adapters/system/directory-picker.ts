import { open } from '@tauri-apps/plugin-dialog'
import { homeDir } from '@tauri-apps/api/path'

import { AppError } from '@/domain/errors'

export interface PickedProjectDirectory {
  absolutePath: string
  relativePath: string
  name: string
}

export function relativeToHome(path: string, home: string): string {
  const normalizedPath = path.replaceAll('\\', '/').replace(/\/+$/, '')
  const normalizedHome = home.replaceAll('\\', '/').replace(/\/+$/, '')
  if (normalizedPath === normalizedHome) {
    throw new AppError('E_VALIDATION_FAILED', '请选择一个具体的项目目录，而不是主目录', { path })
  }
  const prefix = `${normalizedHome}/`
  if (!normalizedPath.startsWith(prefix)) {
    throw new AppError('E_VALIDATION_FAILED', '项目目录目前必须位于用户主目录下', { path })
  }
  return normalizedPath.slice(prefix.length)
}

export async function pickProjectDirectory(): Promise<PickedProjectDirectory | null> {
  // recursive=true 会把所选目录及其配置子目录加入 Tauri fs scope；否则
  // `.claude/settings.json` 这类嵌套写入会被 allow-exists / allow-rename 拒绝。
  const selected = await open({
    directory: true,
    multiple: false,
    recursive: true,
    title: '选择项目目录',
  })
  if (typeof selected !== 'string') {
    return null
  }
  const home = await homeDir()
  const relativePath = relativeToHome(selected, home)
  const parts = relativePath.split('/').filter(Boolean)
  return { absolutePath: selected, relativePath, name: parts[parts.length - 1] ?? relativePath }
}
