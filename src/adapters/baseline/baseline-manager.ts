import type { BackupManager } from '@/adapters/backup/backup-manager'
import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { PATHS } from '@/constants/paths'
import { AppError, toAppError } from '@/domain/errors'
import type { TargetTool } from '@/domain/entities/preset'
import {
  EMPTY_BASELINE_MANIFEST,
  baselineManifestSchema,
  type BaselineEntry,
  type BaselineManifest,
} from '@/domain/schemas/baseline'
import type { FileSystemPort } from '@/types/fs-port'

function basenameOf(path: string): string {
  const parts = path.split('/')
  const last = parts[parts.length - 1]
  if (!last) {
    throw new Error(`非法路径: ${path}`)
  }
  return last
}

function dirnameOf(path: string): string {
  const index = path.lastIndexOf('/')
  if (index <= 0) {
    throw new Error(`非法路径: ${path}`)
  }
  return path.slice(0, index)
}

/**
 * 安装前基线管理器：~/.aiswitch/baseline/<tool>/<文件名> + manifest.json。
 * 独立于 backups 目录，不受滚动清理影响；「安装前」锚点一经捕获不再变化，
 * 还原后保留（重新启用再还原语义仍正确）。
 * 基线副本与备份同级风险（含明文密钥）：目录 0700 + 文件 0600 逐层收紧。
 */
export class BaselineManager {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly backups: BackupManager
  ) {}

  private copyPath(tool: TargetTool, file: string): string {
    return `${PATHS.baselineDir}/${tool}/${basenameOf(file)}`
  }

  private manifestPath(): string {
    return `${PATHS.baselineDir}/manifest.json`
  }

  /** manifest 损坏是独立故障：一键还原不允许基于可疑清单行动 */
  async manifest(): Promise<BaselineManifest> {
    const path = this.manifestPath()
    if (!(await this.fs.exists(path))) {
      return EMPTY_BASELINE_MANIFEST
    }
    try {
      const parsed = baselineManifestSchema.parse(JSON.parse(await this.fs.readTextFile(path)))
      return parsed
    } catch (error) {
      throw toAppError(error, 'E_BASELINE_FAILED', '基线清单解析失败', { path })
    }
  }

  /** 指定工具是否已捕获基线 */
  async exists(tool: TargetTool): Promise<boolean> {
    const manifest = await this.manifest()
    return manifest.tools[tool] !== undefined
  }

  /**
   * 首次写入前捕获基线（幂等；已捕获返回 false）：
   * - 文件不存在 → absent（应用将来会创建它，还原时删除）；
   * - 文件存在且无历史备份 → 当前内容即安装前内容，复制副本（captured）；
   * - 文件存在但有历史备份（升级到含基线功能前的旧切换）→ 原始内容只可能在
   *   备份链里，不再落一份明文副本（degraded，还原走最早备份）。
   */
  async captureIfAbsent(tool: TargetTool, files: readonly string[]): Promise<boolean> {
    if (files.length === 0) {
      throw new AppError('E_BASELINE_FAILED', '受管文件清单为空，无法捕获基线', { tool })
    }
    const manifest = await this.manifest()
    if (manifest.tools[tool] !== undefined) {
      return false
    }
    const backupNames = await this.backups.list(tool)
    const dirExisted = await this.fs.exists(dirnameOf(files[0] ?? ''))
    const entries: Record<string, BaselineEntry> = {}
    const capturedAt = new Date().toISOString()
    for (const file of files) {
      entries[file] = await this.captureEntry(tool, file, backupNames, capturedAt)
    }
    const next: BaselineManifest = {
      ...manifest,
      tools: { ...manifest.tools, [tool]: { dirExisted, files: entries } },
    }
    await this.persist(tool, next)
    return true
  }

  private async captureEntry(
    tool: TargetTool,
    file: string,
    backupNames: readonly string[],
    capturedAt: string
  ): Promise<BaselineEntry> {
    if (!(await this.fs.exists(file))) {
      return { status: 'absent', capturedAt }
    }
    const basename = basenameOf(file)
    const hasBackup = backupNames.some((name) => name.endsWith(`--${basename}`))
    if (hasBackup) {
      return { status: 'degraded', capturedAt }
    }
    const content = await this.fs.readTextFile(file)
    // 基线副本是「精确还原」的锚点，必须与切换写入同等原子性：
    // 半截副本一旦被还原将把坏配置写回用户磁盘，代价远高于一次写失败
    await writeTextAtomic(this.fs, this.copyPath(tool, file), content)
    return { status: 'captured', capturedAt }
  }

  /** 落盘 manifest 并逐层收紧目录权限 */
  private async persist(tool: TargetTool, manifest: BaselineManifest): Promise<void> {
    await this.fs.mkdir(PATHS.baselineDir)
    await this.fs.mkdir(`${PATHS.baselineDir}/${tool}`)
    await writeTextAtomic(this.fs, this.manifestPath(), JSON.stringify(manifest, null, 2))
    await this.restrict(PATHS.appDir)
    await this.restrict(PATHS.baselineDir)
    await this.restrict(`${PATHS.baselineDir}/${tool}`)
  }

  private async restrict(path: string): Promise<void> {
    try {
      await this.fs.restrictPermissions(path)
    } catch (error) {
      throw toAppError(error, 'E_FS_PERMISSION', '文件权限收紧失败', { path })
    }
  }

  /** 读取 captured 状态文件的安装前内容；副本缺失返回 null（调用方降级处理） */
  async readCaptured(tool: TargetTool, file: string): Promise<string | null> {
    const copyPath = this.copyPath(tool, file)
    if (!(await this.fs.exists(copyPath))) {
      return null
    }
    return this.fs.readTextFile(copyPath)
  }
}
