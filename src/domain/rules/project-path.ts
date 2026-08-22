import { AppError } from '@/domain/errors'

/** 将目录限制在 HOME 相对路径，阻止项目写入逃逸到受管范围之外。 */
export function normalizeProjectPath(path: string): string {
  const normalized = path.trim().replaceAll('\\', '/')
  if (normalized === '' || normalized === '.') {
    return ''
  }
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    throw new AppError('E_VALIDATION_FAILED', '项目目录必须填写 HOME 下的相对路径', { path })
  }
  const parts = normalized.split('/').filter(Boolean)
  if (parts.some((part) => part === '..')) {
    throw new AppError('E_VALIDATION_FAILED', '项目目录不能包含 ..', { path })
  }
  return parts.join('/')
}

export function projectConfigPath(projectPath: string, fileName: string): string {
  const base = normalizeProjectPath(projectPath)
  return base ? `${base}/${fileName}` : fileName
}
