import { open } from '@tauri-apps/plugin-dialog'
import { homeDir } from '@tauri-apps/api/path'

import { AppError } from '@/domain/errors'

import { grantProjectDirs } from '@/adapters/system/fs-scope'

export interface PickedProjectDirectory {
  absolutePath: string
  relativePath: string
  name: string
}

export function relativeToHome(path: string, home: string): string {
  const normalizedPath = path.replaceAll('\\', '/').replace(/\/+$/, '')
  const normalizedHome = home.replaceAll('\\', '/').replace(/\/+$/, '')
  if (samePath(normalizedPath, normalizedHome)) {
    throw new AppError('E_VALIDATION_FAILED', '请选择一个具体的项目目录，而不是主目录', { path })
  }
  const prefix = `${normalizedHome}/`
  if (!hasPrefix(normalizedPath, prefix)) {
    throw new AppError('E_VALIDATION_FAILED', '项目目录目前必须位于用户主目录下', { path })
  }
  return normalizedPath.slice(prefix.length)
}

/** Windows 路径大小写不敏感：盘符/用户名大小写与 homeDir() 不一致时不能误判为「不在主目录下」 */
function isWindowsPath(value: string): boolean {
  return /^[A-Za-z]:\//.test(value)
}

function samePath(left: string, right: string): boolean {
  if (isWindowsPath(left) || isWindowsPath(right)) {
    return left.toLowerCase() === right.toLowerCase()
  }
  return left === right
}

function hasPrefix(path: string, prefix: string): boolean {
  if (isWindowsPath(path)) {
    return path.toLowerCase().startsWith(prefix.toLowerCase())
  }
  return path.startsWith(prefix)
}

export async function pickProjectDirectory(): Promise<PickedProjectDirectory | null> {
  // 不开 recursive：授权必须发生在「主目录内」校验通过之后，否则被拒绝的选择
  // 也会凭对话框自身的 scope 注入留下一个会话级目录范围。
  const selected = await open({
    directory: true,
    multiple: false,
    title: '选择项目目录',
  })
  if (typeof selected !== 'string') {
    return null
  }
  const home = await homeDir()
  // 先校验再显式授权（递归范围由 allow_project_dirs 统一授予，失败即视为选择失败）
  const relativePath = relativeToHome(selected, home)
  await grantProjectDirs([selected])
  const parts = relativePath.split('/').filter(Boolean)
  return { absolutePath: selected, relativePath, name: parts[parts.length - 1] ?? relativePath }
}
