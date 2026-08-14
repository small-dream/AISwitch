const BACKUP_SEPARATOR = '--'

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

/** 本地时间戳 yyyyMMdd-HHmmss：字典序即时间序 */
export function formatBackupTimestamp(date: Date): string {
  const datePart = `${String(date.getFullYear())}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const timePart = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${datePart}-${timePart}`
}

export function backupFileName(basename: string, date: Date): string {
  return `${formatBackupTimestamp(date)}${BACKUP_SEPARATOR}${basename}`
}

/** 指定源文件最新一份备份的文件名；无则 null */
export function latestBackupName(names: readonly string[], basename: string): string | null {
  const matched = names
    .filter((name) => name.endsWith(`${BACKUP_SEPARATOR}${basename}`))
    .sort()
    .reverse()
  return matched[0] ?? null
}

/** 超出保留数量时应清理的旧备份名（按新到旧排列） */
export function namesToPrune(names: readonly string[], keep = 20): string[] {
  return [...names].sort().reverse().slice(keep)
}
