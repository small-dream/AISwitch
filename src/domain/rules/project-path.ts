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

/**
 * 记录中的 HOME 相对目录 → 待授权的绝对目录。
 * 记录文件在磁盘上可被外部改写，启动重授权前必须再过一遍规范化：
 * 绝对路径、`..` 逃逸与空路径一律返回 null（不授权），避免一次篡改把整个磁盘
 * 加进本次会话的 fs scope。
 */
export function absoluteProjectDir(home: string, relative: string): string | null {
  let normalized: string
  try {
    normalized = normalizeProjectPath(relative)
  } catch {
    return null
  }
  if (!normalized) {
    return null
  }
  const base = home.replaceAll('\\', '/').replace(/\/+$/, '')
  return `${base}/${normalized}`
}
