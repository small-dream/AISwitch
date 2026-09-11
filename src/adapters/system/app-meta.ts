import { getVersion } from '@tauri-apps/api/app'

import { toAppError } from '@/domain/errors'
import { isTauriRuntime } from '@/adapters/updater/tauri-updater'

/** 读取应用版本号；非 Tauri 运行时（浏览器开发模式）返回空串，调用方按「无版本」处理 */
export async function getAppVersion(): Promise<string> {
  if (!isTauriRuntime()) {
    return ''
  }
  try {
    return await getVersion()
  } catch (error) {
    throw toAppError(error, 'E_UNKNOWN', '读取应用版本失败')
  }
}
