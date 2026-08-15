import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { PATHS } from '@/constants/paths'
import { toAppError } from '@/domain/errors'
import type { TargetTool } from '@/domain/entities/preset'
import {
  backupFileName,
  latestBackupName,
  namesToPrune,
  parseBackupName,
} from '@/domain/rules/backup-naming'
import type { FileSystemPort } from '@/types/fs-port'

/** 每个工具每个源文件保留的备份份数（PRD §5.4） */
const KEEP_COUNT = 20

function basenameOf(path: string): string {
  const parts = path.split('/')
  const last = parts[parts.length - 1]
  if (!last) {
    throw new Error(`非法路径: ${path}`)
  }
  return last
}

/** 备份管理器：~/.aiswitch/backups/<tool>/<时间戳>--<文件名> */
export class BackupManager {
  constructor(private readonly fs: FileSystemPort) {}

  private dirFor(tool: TargetTool): string {
    return `${PATHS.backupsDir}/${tool}`
  }

  /** 备份源文件；源不存在时返回 null（首次写入场景无需备份） */
  async backup(tool: TargetTool, sourcePath: string): Promise<string | null> {
    if (!(await this.fs.exists(sourcePath))) {
      return null
    }
    const content = await this.fs.readTextFile(sourcePath)
    const dir = this.dirFor(tool)
    await this.fs.mkdir(dir)
    // 备份内容含明文密钥：目录 0700 + 文件 0600，逐层收紧
    await this.restrict(PATHS.appDir)
    await this.restrict(PATHS.backupsDir)
    await this.restrict(dir)
    const name = backupFileName(basenameOf(sourcePath), new Date())
    const backupPath = `${dir}/${name}`
    await this.fs.writeTextFile(backupPath, content)
    await this.restrict(backupPath)
    await this.tightenExisting(tool, name)
    await this.prune(tool)
    return name
  }

  /** best-effort 治愈历史遗留的 0644 备份文件（跳过刚写入并已收紧的 skipName）；单文件失败不影响备份主流程 */
  private async tightenExisting(tool: TargetTool, skipName: string): Promise<void> {
    const dir = this.dirFor(tool)
    for (const name of await this.fs.readDir(dir)) {
      if (name === skipName || parseBackupName(name) === null) {
        continue
      }
      await this.fs.restrictPermissions(`${dir}/${name}`).catch(() => undefined)
    }
  }

  /** 权限收紧失败是独立故障，不得混入普通备份错误 */
  private async restrict(path: string): Promise<void> {
    try {
      await this.fs.restrictPermissions(path)
    } catch (error) {
      throw toAppError(error, 'E_FS_PERMISSION', '文件权限收紧失败', { path })
    }
  }

  /** 指定工具全部备份文件名（新到旧）；目录不存在返回空 */
  async list(tool: TargetTool): Promise<string[]> {
    const dir = this.dirFor(tool)
    if (!(await this.fs.exists(dir))) {
      return []
    }
    const names = await this.fs.readDir(dir)
    return names
      .filter((name) => parseBackupName(name) !== null)
      .sort()
      .reverse()
  }

  /** 按备份名恢复到指定路径 */
  async restore(tool: TargetTool, name: string, targetPath: string): Promise<void> {
    const parsed = parseBackupName(name)
    if (parsed?.basename !== basenameOf(targetPath)) {
      throw new Error(`非法备份名: ${name}`)
    }
    const dir = this.dirFor(tool)
    const content = await this.fs.readTextFile(`${dir}/${name}`)
    await writeTextAtomic(this.fs, targetPath, content)
  }

  /** 恢复指定源文件的最近一份备份；无可用备份返回 false */
  async restoreLatest(tool: TargetTool, targetPath: string): Promise<boolean> {
    const dir = this.dirFor(tool)
    if (!(await this.fs.exists(dir))) {
      return false
    }
    const latest = latestBackupName(await this.fs.readDir(dir), basenameOf(targetPath))
    if (!latest) {
      return false
    }
    await this.restore(tool, latest, targetPath)
    return true
  }

  /** 删除指定备份文件 */
  async removeOne(tool: TargetTool, name: string): Promise<void> {
    if (!parseBackupName(name)) {
      throw new Error(`非法备份名: ${name}`)
    }
    await this.fs.remove(`${this.dirFor(tool)}/${name}`)
  }

  private async prune(tool: TargetTool): Promise<void> {
    const dir = this.dirFor(tool)
    if (!(await this.fs.exists(dir))) {
      return
    }
    for (const name of namesToPrune(await this.fs.readDir(dir), KEEP_COUNT)) {
      await this.fs.remove(`${dir}/${name}`)
    }
  }
}
