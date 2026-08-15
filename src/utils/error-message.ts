import { isAppError } from '@/domain/errors'
import { localizeMessage } from '@/i18n/messages'

/** 提取面向用户的错误信息（UI 层展示用）；Tauri 插件错误常以字符串抛出，需透传 */
export function errorMessage(error: unknown): string {
  if (isAppError(error)) {
    return localizeMessage(error.message)
  }
  if (typeof error === 'string' && error.length > 0) {
    return error
  }
  if (error instanceof Error) {
    return error.message
  }
  return localizeMessage('发生未知错误')
}
