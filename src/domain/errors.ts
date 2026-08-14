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
