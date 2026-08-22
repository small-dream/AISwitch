/**
 * API Key 遮蔽展示：保留首尾各 visibleEnds 位，中间固定 6 个星号。
 * 长度不足 visibleEnds*2+4 时全遮蔽：保证星号至少 4 个、明文暴露不超过一半。
 */
export function maskApiKey(key: string | undefined, visibleEnds = 4): string {
  if (!key) {
    return ''
  }
  if (key.length <= visibleEnds * 2 + 4) {
    return '*'.repeat(key.length)
  }
  return `${key.slice(0, visibleEnds)}${'*'.repeat(6)}${key.slice(-visibleEnds)}`
}
