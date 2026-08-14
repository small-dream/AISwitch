import type { ErrorCode } from '@/constants/error-codes'

export type AppErrorContext = Readonly<Record<string, unknown>>

/** 全应用唯一错误类型：Adapter 抛出 → Service 包装 → UI 统一拦截 */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly context: AppErrorContext

  constructor(code: ErrorCode, message: string, context: AppErrorContext = {}) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.context = context
  }

  toJSON(): { code: ErrorCode; message: string; context: AppErrorContext } {
    return { code: this.code, message: this.message, context: this.context }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/** 适配层兜底转换：已是 AppError 原样透传，否则包装为带上下文的应用错误 */
export function toAppError(
  error: unknown,
  fallbackCode: ErrorCode,
  message: string,
  context: AppErrorContext = {}
): AppError {
  if (isAppError(error)) {
    return error
  }
  if (error instanceof Error) {
    return new AppError(fallbackCode, message, { ...context, cause: error.message })
  }
  if (typeof error === 'string' && error.length > 0) {
    // Tauri 插件命令失败时常以字符串拒绝
    return new AppError(fallbackCode, message, { ...context, cause: error })
  }
  return new AppError('E_UNKNOWN', message, context)
}
