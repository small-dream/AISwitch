import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'

/** 系统通知（托盘切换等无窗口场景的反馈出口）；浏览器调试环境静默忽略 */
export async function notifyDesktop(title: string, body: string): Promise<void> {
  try {
    let granted = await isPermissionGranted()
    if (!granted) {
      granted = (await requestPermission()) === 'granted'
    }
    if (granted) {
      sendNotification({ title, body })
    }
  } catch {
    // 非 Tauri 环境忽略
  }
}
