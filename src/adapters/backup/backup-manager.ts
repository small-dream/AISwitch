import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { PATHS } from '@/constants/paths'
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
    const name = backupFileName(basenameOf(sourcePath), new Date())
    await this.fs.writeTextFile(`${dir}/${name}`, content)
    await this.prune(tool)
    return name
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
