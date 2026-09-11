import { replaceModelCatalog } from '@/domain/rules/codex-catalog'
import { mergeClaudeSettings, stripManagedClaudeKeys } from '@/domain/rules/claude-merge'
import { mergeCodexAuth, mergeCodexConfig, stripManagedCodexAuth, stripManagedCodexConfig } from '@/domain/rules/codex-merge'
import { normalizeProjectPath, projectConfigPath } from '@/domain/rules/project-path'
import { AppError, toAppError } from '@/domain/errors'
import type { Preset, TargetTool, ToolStatus } from '@/domain/entities/preset'
import type { FileSystemPort } from '@/types/fs-port'
import type { PresetRepository } from '@/adapters/presets/preset-repository'
import type { ProjectConfigRecord } from '@/domain/entities/project-config-record'
import type { ProjectConfigOps, ProjectConfigRecordStore } from '@/types/project-config-ops'

export interface ProjectConfigResult {
  projectPath: string
  tool: TargetTool
  configPath: string
}

/** 待写入的项目文件（相对项目根的正斜杠路径） */
interface FileWrite {
  path: string
  contents: string
}

/** 写入前的文件状态：content 为 null 表示此前不存在 */
interface FileSnapshot {
  path: string
  content: string | null
}

function projectFs(fs: FileSystemPort, projectPath: string): FileSystemPort {
  const base = normalizeProjectPath(projectPath)
  const resolve = (path: string) => (base ? `${base}/${path}` : path)
  return {
    homeDir: () => fs.homeDir(),
    exists: (path) => fs.exists(resolve(path)),
    readTextFile: (path) => fs.readTextFile(resolve(path)),
    writeTextFile: (path, contents) => fs.writeTextFile(resolve(path), contents),
    readDir: (path) => fs.readDir(resolve(path)),
    mkdir: (path) => fs.mkdir(resolve(path)),
    remove: (path) => fs.remove(resolve(path)),
    rename: (from, to) => fs.rename(resolve(from), resolve(to)),
    restrictPermissions: (path) => fs.restrictPermissions(resolve(path)),
  }
}

/** 项目级配置用例：只写项目目录，绝不调用全局 target。 */
export class ProjectConfigService {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly presets: PresetRepository,
    private readonly records: ProjectConfigRecordStore,
    private readonly ops: ProjectConfigOps
  ) {}

  async listRecords(tool: TargetTool): Promise<ProjectConfigRecord[]> {
    const records = await this.records.list()
    return records.filter((record) => record.tool === tool)
  }

  async apply(projectPath: string, tool: TargetTool, presetId: string): Promise<ProjectConfigResult> {
    const preset = await this.findPreset(tool, presetId)
    const scoped = projectFs(this.fs, projectPath)
    if (tool === 'claude-code') {
      return this.applyClaude(scoped, projectPath, preset)
    }
    return this.applyCodex(scoped, projectPath, preset)
  }

  private async applyClaude(
    scoped: FileSystemPort,
    projectPath: string,
    preset: Preset
  ): Promise<ProjectConfigResult> {
    const current = await this.ops.readClaudeSettings(scoped)
    await scoped.mkdir('.claude')
    await this.ops.writeTextAtomic(
      scoped,
      '.claude/settings.json',
      this.ops.serializeClaudeSettings(mergeClaudeSettings(current ?? {}, preset))
    )
    await this.saveRecord(projectPath, 'claude-code')
    return {
      projectPath: normalizeProjectPath(projectPath),
      tool: 'claude-code',
      configPath: projectConfigPath(projectPath, '.claude/settings.json'),
    }
  }

  private async applyCodex(
    scoped: FileSystemPort,
    projectPath: string,
    preset: Preset
  ): Promise<ProjectConfigResult> {
    const current = await this.ops.readCodexConfig(scoped)
    const auth = await this.ops.readCodexAuth(scoped)
    const config = mergeCodexConfig(current ?? {}, preset)
    const projectModelsPath = projectConfigPath(projectPath, '.codex/models.json')
    const configWithCatalog = preset.modelMetadata
      ? { ...config, model_catalog_json: `${await this.fs.homeDir()}/${projectModelsPath}`.replaceAll('\\', '/') }
      : config
    const writes: FileWrite[] = [
      { path: '.codex/config.toml', contents: this.ops.serializeCodexConfig(configWithCatalog) },
      { path: '.codex/auth.json', contents: this.ops.serializeCodexAuth(mergeCodexAuth(auth, preset)) },
    ]
    if (preset.modelMetadata) {
      const catalog = await this.ops.readCodexModels(scoped)
      writes.push({
        path: '.codex/models.json',
        contents: this.ops.serializeCodexModels(replaceModelCatalog(catalog, preset)),
      })
    }
    await scoped.mkdir('.codex')
    await this.writeWithRollback(scoped, writes)
    await this.saveRecord(projectPath, 'codex')
    return {
      projectPath: normalizeProjectPath(projectPath),
      tool: 'codex',
      configPath: projectConfigPath(projectPath, '.codex/config.toml'),
    }
  }

  /** 多文件写入的失败保护：写前快照各目标文件，任一失败回滚到写前状态后按原错误码重抛 */
  private async writeWithRollback(fs: FileSystemPort, writes: FileWrite[]): Promise<void> {
    const snapshots = await this.snapshotAll(fs, writes)
    try {
      for (const write of writes) {
        await this.ops.writeTextAtomic(fs, write.path, write.contents)
      }
    } catch (error) {
      const rolledBack = await this.tryRestore(fs, snapshots)
      const original = toAppError(error, 'E_CONFIG_WRITE', '项目配置写入失败')
      throw new AppError(original.code, original.message, { ...original.context, rolledBack })
    }
  }

  private async snapshotAll(fs: FileSystemPort, writes: FileWrite[]): Promise<FileSnapshot[]> {
    const snapshots: FileSnapshot[] = []
    for (const write of writes) {
      const content = (await fs.exists(write.path)) ? await fs.readTextFile(write.path) : null
      snapshots.push({ path: write.path, content })
    }
    return snapshots
  }

  /** 回滚自身也可能失败（如磁盘故障），不得掩盖原始错误，仅以 rolledBack 如实上报 */
  private async tryRestore(fs: FileSystemPort, snapshots: FileSnapshot[]): Promise<boolean> {
    try {
      for (const snapshot of snapshots) {
        await this.restoreSnapshot(fs, snapshot)
      }
      return true
    } catch {
      return false
    }
  }

  private async restoreSnapshot(fs: FileSystemPort, snapshot: FileSnapshot): Promise<void> {
    if (snapshot.content === null) {
      if (await fs.exists(snapshot.path)) {
        await fs.remove(snapshot.path)
      }
      return
    }
    await this.ops.writeTextAtomic(fs, snapshot.path, snapshot.content)
  }

  /** 移除 AISwitch 托管配置项，保留项目文件中的其他用户内容。 */
  async remove(projectPath: string, tool: TargetTool): Promise<ProjectConfigResult> {
    const scoped = projectFs(this.fs, projectPath)
    if (tool === 'claude-code') {
      const path = '.claude/settings.json'
      if (await scoped.exists(path)) {
        const current = await this.ops.readClaudeSettings(scoped)
        if (current) {
          const stripped = stripManagedClaudeKeys(current)
          await this.writeOrRemove(scoped, path, this.ops.serializeClaudeSettings(stripped), Object.keys(stripped).length === 0)
        }
      }
      await this.records.remove(normalizeProjectPath(projectPath), tool)
      return { projectPath: normalizeProjectPath(projectPath), tool, configPath: projectConfigPath(projectPath, path) }
    }
    const configPath = '.codex/config.toml'
    const authPath = '.codex/auth.json'
    const config = await this.ops.readCodexConfig(scoped)
    const home = await this.fs.homeDir()
    const managedCatalogPath = `${home}/${projectConfigPath(projectPath, '.codex/models.json')}`.replaceAll('\\', '/')
    if (config) {
      const stripped = stripManagedCodexConfig(config, managedCatalogPath)
      await this.writeOrRemove(scoped, configPath, this.ops.serializeCodexConfig(stripped), Object.keys(stripped).length === 0)
    }
    const auth = await this.ops.readCodexAuth(scoped)
    if (auth !== null) {
      const strippedAuth = stripManagedCodexAuth(auth)
      await this.writeOrRemove(scoped, authPath, strippedAuth ? this.ops.serializeCodexAuth(strippedAuth) : '', strippedAuth === null)
    }
    // models.json 可能由用户或供应商预先维护，移除项目配置时保守保留，避免误删模型目录。
    await this.records.remove(normalizeProjectPath(projectPath), tool)
    return { projectPath: normalizeProjectPath(projectPath), tool, configPath: projectConfigPath(projectPath, configPath) }
  }

  async detect(projectPath: string, tool: TargetTool): Promise<ToolStatus> {
    const scoped = projectFs(this.fs, projectPath)
    try {
      if (tool === 'claude-code') {
        const config = await this.ops.readClaudeSettings(scoped)
        return config ? { tool, status: 'installed', activeModel: config.env?.ANTHROPIC_MODEL ?? config.model, activeProviderName: config.env?.ANTHROPIC_BASE_URL ?? '官方 API' } : { tool, status: 'not-configured' }
      }
      const config = await this.ops.readCodexConfig(scoped)
      return config?.model
        ? { tool, status: 'installed', activeModel: config.model, activeProviderName: config.model_provider }
        : { tool, status: 'not-configured' }
    } catch {
      return { tool, status: 'unknown' }
    }
  }

  private async findPreset(tool: TargetTool, presetId: string): Promise<Preset> {
    const preset = (await this.presets.list()).find((item) => item.id === presetId)
    if (preset?.tool !== tool) {
      throw new AppError('E_PRESET_NOT_FOUND', '项目预设不存在或目标工具不匹配', { presetId, tool })
    }
    return preset
  }

  private async saveRecord(projectPath: string, tool: TargetTool): Promise<void> {
    await this.records.upsert({
      projectPath: normalizeProjectPath(projectPath),
      tool,
      updatedAt: new Date().toISOString(),
    })
  }

  private async writeOrRemove(
    fs: FileSystemPort,
    path: string,
    contents: string,
    shouldRemove: boolean
  ): Promise<void> {
    if (shouldRemove) {
      await fs.remove(path)
      return
    }
    await this.ops.writeTextAtomic(fs, path, contents)
  }
}
