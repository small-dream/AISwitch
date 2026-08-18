/**
 * Base URL 安全策略（隐私红线）：
 * 探测请求会携带 API Key，因此明文 http 仅放行本机回环地址；
 * 其余一律要求 https，防止密钥明文外发到中转站 / 任意主机。
 *
 * 注：Tauri  capability 的 URL pattern 不支持 IPv6 字面量（如 http://[::1]），
 * 因此 http 白名单仅保留 localhost / 127.0.0.1，与 capability 保持一致。
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1'])

/** 留空（官方 API，恒为 https）或 https 任意主机；http 仅允许本机回环 */
export function isAllowedBaseUrl(raw: string | undefined): boolean {
  if (!raw) {
    return true
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol === 'https:') {
    return true
  }
  if (url.protocol === 'http:') {
    // 用 hostname 精确匹配，防 http://localhost.evil.com 前缀伪装
    return LOOPBACK_HOSTS.has(url.hostname.toLowerCase())
  }
  return false
}
