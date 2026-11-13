import type { BackupManager } from '@/adapters/backup/backup-manager'
import { AppError, toAppError, type AppErrorContext } from '@/domain/errors'
import type { FileSystemPort } from '@/types/fs-port'

/** 本次实际改写的文件及其备份名；backupName 为 null 表示源文件此前不存在 */
export interface ManagedFile {
  path: string
  backupName: string | null
}

export interface RollbackOutcome {
  restored: boolean
  failed: boolean
}

async function rollbackFile(
  fs: FileSystemPort,
  backups: BackupManager,
  file: ManagedFile
): Promise<void> {
  if (file.backupName === null) {
    if (await fs.exists(file.path)) {
      await fs.remove(file.path)
    }
    return
  }
  await backups.restore('codex', file.backupName, file.path)
}

/** 仅回滚本次实际改写的文件；单文件失败不阻断其余文件，失败汇总进 outcome */
export async function rollbackManaged(
  fs: FileSystemPort,
  backups: BackupManager,
  files: readonly ManagedFile[]
): Promise<RollbackOutcome> {
  let restored = false
  let failed = false
  for (const file of files) {
    try {
      await rollbackFile(fs, backups, file)
      restored = restored || file.backupName !== null
    } catch {
      failed = true
    }
  }
  return { restored, failed }
}

/** 保留原错误码，在消息与 context 中如实标注回滚结果（失败绝不谎称已回滚） */
export function applyFailure(error: unknown, outcome: RollbackOutcome): AppError {
  const original = toAppError(error, 'E_CONFIG_WRITE', '应用配置失败', { tool: 'codex' })
  const suffix = outcome.failed
    ? '自动回滚也失败，请从备份目录手动恢复'
    : outcome.restored
      ? '已自动回滚'
      : '已清理本次新建的配置文件'
  const context: AppErrorContext = {
    ...original.context,
    rollbackFailed: outcome.failed,
    rolledBack: !outcome.failed && outcome.restored,
  }
  return new AppError(original.code, `${original.message}；${suffix}`, context)
}
