import type { BaselineManager } from '@/adapters/baseline/baseline-manager'
import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { readClaudeSettings } from '@/adapters/claude/reader'
import { writeClaudeSettings } from '@/adapters/claude/writer'
import { readCodexAuth, readCodexConfig } from '@/adapters/codex/reader'
import { writeCodexAuth, writeCodexConfig } from '@/adapters/codex/writer'
import type { BackupService, BackupEntry } from '@/services/backup-service'
import { PATHS } from '@/constants/paths'
import { AppError, toAppError } from '@/domain/errors'
import type { TargetTool } from '@/domain/entities/preset'
import { stripManagedClaudeKeys } from '@/domain/rules/claude-merge'
import { stripManagedCodexAuth, stripManagedCodexConfig } from '@/domain/rules/codex-merge'
import { codexCatalogAbsolutePath } from '@/domain/rules/codex-catalog'
import { MANAGED_FILES } from '@/services/switch-service'
import type { FileSystemPort } from '@/types/fs-port'

/** 还原动作：精确还原基线 / 近似还原最早备份 / 剥离托管键 / 删除应用创建的文件 / 跳过 */
export type RestoreAction =
  'restore-baseline' | 'restore-earliest-backup' | 'strip-managed-keys' | 'delete' | 'keep'

export interface RestoreFilePlan {
  tool: TargetTool
  /** 相对 HOME 的正斜杠路径 */
  file: string
  action: RestoreAction
  /** true = 无法精确回到安装前（最早备份可能已含应用写入内容 / 仅剥离托管键） */
  approximate: boolean
}

export interface RestorePlan {
  hasBaseline: boolean
  files: RestoreFilePlan[]
}

export interface RestoreFileResult {
  file: string
  status: 'done' | 'failed' | 'skipped'
  detail?: string
}

export interface RestoreResult {
  results: RestoreFileResult[]
  allSucceeded: boolean
}

function basenameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function dirnameOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/'))
}

/**
 * 一键还原用例（PRD US-一键还原）：把工具配置恢复到本应用首次写入之前的状态。
 * 安全不变式：
 * - 永不删除应用未创建/未修改的文件（absent 标记才删除，目录仅在
 *   「应用创建 + 现已为空」时移除）；
 * - 无基线/无备份时降级为剥离托管键（merge 的逆操作），用户自有配置保留；
 * - ~/.aiswitch（预设/备份/基线）完全不动，UI 明示保留；
 * - 逐文件容错：单个失败记录后继续，结果如实上报。
 */
export class RestoreService {
  constructor(
    private readonly deps: {
      fs: FileSystemPort
      baselines: BaselineManager
      backups: BackupService
    }
  ) {}

  private async earliestBackup(tool: TargetTool, file: string): Promise<BackupEntry | null> {
    // BackupService.list 新到旧排列，末位即最早一份
    const entries = await this.deps.backups.list(tool)
    const matched = entries.filter((entry) => entry.basename === basenameOf(file))
    return matched[matched.length - 1] ?? null
  }

  /** 计算还原计划（UI 预览用）；不执行任何写入 */
  async plan(): Promise<RestorePlan> {
    const manifest = await this.deps.baselines.manifest()
    const files: RestoreFilePlan[] = []
    for (const tool of Object.keys(MANAGED_FILES) as TargetTool[]) {
      const toolState = manifest.tools[tool]
      for (const file of MANAGED_FILES[tool]) {
        const entry = toolState?.files[file]
        files.push(await this.planFile(tool, file, entry?.status))
      }
    }
    return { hasBaseline: Object.keys(manifest.tools).length > 0, files }
  }

  private async planFile(
    tool: TargetTool,
    file: string,
    status: 'captured' | 'absent' | 'degraded' | undefined
  ): Promise<RestoreFilePlan> {
    if (!(await this.deps.fs.exists(file))) {
      return { tool, file, action: 'keep', approximate: false }
    }
    if (status === 'captured') {
      return { tool, file, action: 'restore-baseline', approximate: false }
    }
    if (status === 'absent') {
      return { tool, file, action: 'delete', approximate: false }
    }
    // degraded / 无基线（老用户）：原始内容只可能在备份链里
    if (await this.earliestBackup(tool, file)) {
      return { tool, file, action: 'restore-earliest-backup', approximate: true }
    }
    if (this.canStrip(file)) {
      return { tool, file, action: 'strip-managed-keys', approximate: true }
    }
    // models.json 被应用整体重写且无备份可回：删除有误伤用户目录的风险，保守跳过
    return { tool, file, action: 'keep', approximate: false }
  }

  /** 剥离托管键只适用于键级合并的文件；models.json 是整体重写，无键可剥 */
  private canStrip(file: string): boolean {
    return file !== PATHS.codexModels
  }

  /** 执行还原；不信任计划快照的内容假设，逐文件按当前磁盘状态行动 */
  async execute(): Promise<RestoreResult> {
    const plan = await this.plan()
    const manifest = await this.deps.baselines.manifest()
    const results: RestoreFileResult[] = []
    for (const item of plan.files) {
      try {
        const detail = await this.executeOne(item, manifest.tools[item.tool])
        results.push(
          detail
            ? { file: item.file, status: 'skipped', detail }
            : { file: item.file, status: 'done' }
        )
      } catch (error) {
        results.push({
          file: item.file,
          status: 'failed',
          detail: toAppError(error, 'E_RESTORE_FAILED', '还原文件失败', { file: item.file })
            .message,
        })
      }
    }
    return { results, allSucceeded: results.every((result) => result.status !== 'failed') }
  }

  /** 返回字符串表示「跳过」及原因；null 表示成功 */
  private async executeOne(
    item: RestoreFilePlan,
    toolState: { dirExisted: boolean } | undefined
  ): Promise<string | null> {
    switch (item.action) {
      case 'keep':
        return '无需处理'
      case 'restore-baseline': {
        const content = await this.deps.baselines.readCaptured(item.tool, item.file)
        if (content === null) {
          return '基线副本缺失，已跳过'
        }
        await this.ensureDir(dirnameOf(item.file))
        await writeTextAtomic(this.deps.fs, item.file, content)
        return null
      }
      case 'restore-earliest-backup': {
        const entry = await this.earliestBackup(item.tool, item.file)
        if (!entry) {
          return '备份已不可用，已跳过'
        }
        await this.deps.backups.restore(entry)
        return null
      }
      case 'strip-managed-keys':
        return this.stripManaged(item)
      case 'delete': {
        if (!(await this.deps.fs.exists(item.file))) {
          // 计划与执行之间存在窗口：用户可能已自行删除，按已达成目标跳过而非报错
          return '文件已不存在，已跳过'
        }
        await this.deps.fs.remove(item.file)
        await this.removeDirIfAppCreated(item, toolState)
        return null
      }
    }
  }

  /** 还原需要重建目录（安装前文件存在但目录被删的极端场景）时：目录由应用创建，落盘即收紧 */
  private async ensureDir(dir: string): Promise<void> {
    if (await this.deps.fs.exists(dir)) {
      return
    }
    await this.deps.fs.mkdir(dir)
    await this.deps.fs.restrictPermissions(dir)
  }

  /** 仅当 manifest 记录目录由应用创建、且删除文件后已为空时才移除目录（非递归） */
  private async removeDirIfAppCreated(
    item: RestoreFilePlan,
    toolState: { dirExisted: boolean } | undefined
  ): Promise<void> {
    const dir = dirnameOf(item.file)
    if (toolState?.dirExisted !== false) {
      return
    }
    if (!(await this.deps.fs.exists(dir))) {
      return
    }
    if ((await this.deps.fs.readDir(dir)).length === 0) {
      await this.deps.fs.remove(dir)
    }
  }

  private async stripManaged(item: RestoreFilePlan): Promise<string | null> {
    const { fs } = this.deps
    if (item.file === PATHS.claudeSettings) {
      const settings = await readClaudeSettings(fs)
      if (!settings) {
        return '文件已不存在，无需剥离'
      }
      await writeClaudeSettings(fs, stripManagedClaudeKeys(settings))
      return null
    }
    if (item.file === PATHS.codexConfig) {
      const config = await readCodexConfig(fs)
      if (!config) {
        return '文件已不存在，无需剥离'
      }
      const catalogPath = codexCatalogAbsolutePath(await fs.homeDir())
      await writeCodexConfig(fs, stripManagedCodexConfig(config, catalogPath))
      return null
    }
    if (item.file === PATHS.codexAuth) {
      const auth = await readCodexAuth(fs)
      const stripped = stripManagedCodexAuth(auth)
      if (stripped === null) {
        // 剥空 = 该文件只有应用写入的 Key，按「应用创建」语义删除
        await fs.remove(PATHS.codexAuth)
      } else {
        await writeCodexAuth(fs, stripped)
      }
      return null
    }
    throw new AppError('E_RESTORE_FAILED', '该文件不支持剥离托管键', { file: item.file })
  }
}
