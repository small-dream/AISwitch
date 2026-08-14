/** API Key 遮蔽展示：保留首尾各 visibleEnds 位，中间固定 6 个星号 */
export function maskApiKey(key: string, visibleEnds = 4): string {
  if (key.length <= visibleEnds * 2) {
    return '*'.repeat(key.length)
  }
  return `${key.slice(0, visibleEnds)}${'*'.repeat(6)}${key.slice(-visibleEnds)}`
}
