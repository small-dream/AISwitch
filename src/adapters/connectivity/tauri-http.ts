import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

import type { HttpPort } from '@/types/http-port'

/** 生产环境 HttpPort 实现：Tauri http 插件，无 CORS 限制 */
export const tauriHttp: HttpPort = {
  fetch(url, init) {
    return tauriFetch(url, init)
  },
}
