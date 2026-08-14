/** HTTP 端口：与 Web fetch 签名对齐；生产实现走 Tauri http 插件（绕过 webview CORS） */
export interface HttpPort {
  fetch(url: string, init: RequestInit): Promise<Response>
}
