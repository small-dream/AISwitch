import type { BackupManager } from '@/adapters/backup/backup-manager'
import { PATHS } from '@/constants/paths'
import type { TargetTool } from '@/domain/entities/preset'
import { parseBackupName } from '@/domain/rules/backup-naming'

/** 每个工具受备份监控的配置文件（models.json 由切换流程重写，同样纳入备份与恢复） */
export const BACKUP_FILES: Record<TargetTool, readonly string[]> = {
  'claude-code': [PATHS.claudeSettings],
  codex: [PATHS.codexConfig, PATHS.codexAuth, PATHS.codexModels],
}

export interface BackupEntry {
  tool: TargetTool
  name: string
  timestamp: string
  basename: string
  targetPath: string
}

/** 备份历史用例（PRD US-10）：列表 / 按名恢复 / 删除 */
export class BackupService {
  constructor(private readonly manager: BackupManager) {}

  async list(tool: TargetTool): Promise<BackupEntry[]> {
    const names = await this.manager.list(tool)
    return names.flatMap((name) => this.toEntry(tool, name))
  }

  async restore(entry: BackupEntry): Promise<void> {
    await this.manager.restore(entry.tool, entry.name, entry.targetPath)
  }

  async remove(tool: TargetTool, name: string): Promise<void> {
    await this.manager.removeOne(tool, name)
  }

  private toEntry(tool: TargetTool, name: string): BackupEntry[] {
    const parsed = parseBackupName(name)
    if (!parsed) {
      return []
    }
    const targetPath = BACKUP_FILES[tool].find((path) => path.endsWith(parsed.basename))
    if (!targetPath) {
      return []
    }
    return [{ tool, name, timestamp: parsed.timestamp, basename: parsed.basename, targetPath }]
  }
}
