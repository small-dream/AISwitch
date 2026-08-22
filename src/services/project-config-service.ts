import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { readClaudeSettings } from '@/adapters/claude/reader'
import { serializeClaudeSettings } from '@/adapters/claude/transformer'
import { readCodexAuth, readCodexConfig, readCodexModels } from '@/adapters/codex/reader'
import { serializeCodexAuth, serializeCodexConfig, serializeCodexModels } from '@/adapters/codex/transformer'
import { replaceModelCatalog } from '@/domain/rules/codex-catalog'
import { mergeClaudeSettings } from '@/domain/rules/claude-merge'
import { mergeCodexAuth, mergeCodexConfig, stripManagedCodexAuth, stripManagedCodexConfig } from '@/domain/rules/codex-merge'
import { stripManagedClaudeKeys } from '@/domain/rules/claude-merge'
import { normalizeProjectPath, projectConfigPath } from '@/domain/rules/project-path'
import { AppError } from '@/domain/errors'
import type { Preset, TargetTool, ToolStatus } from '@/domain/entities/preset'
import type { FileSystemPort } from '@/types/fs-port'
import type { PresetRepository } from '@/adapters/presets/preset-repository'
import { ProjectConfigRepository } from '@/adapters/projects/project-config-repository'
import type { ProjectConfigRecord } from '@/domain/entities/project-config-record'

export interface ProjectConfigResult {
  projectPath: string
  tool: TargetTool
  configPath: string
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
    private readonly records = new ProjectConfigRepository(fs)
  ) {}

  async listRecords(tool: TargetTool): Promise<ProjectConfigRecord[]> {
    const records = await this.records.list()
    return records.filter((record) => record.tool === tool)
  }

  async apply(projectPath: string, tool: TargetTool, presetId: string): Promise<ProjectConfigResult> {
    const preset = await this.findPreset(tool, presetId)
    const scoped = projectFs(this.fs, projectPath)
    if (tool === 'claude-code') {
      const current = await readClaudeSettings(scoped)
      await scoped.mkdir('.claude')
      await writeTextAtomic(scoped, '.claude/settings.json', serializeClaudeSettings(mergeClaudeSettings(current ?? {}, preset)))
      await this.saveRecord(projectPath, tool)
      return { projectPath: normalizeProjectPath(projectPath), tool, configPath: projectConfigPath(projectPath, '.claude/settings.json') }
    }
    const current = await readCodexConfig(scoped)
    const auth = await readCodexAuth(scoped)
    const config = mergeCodexConfig(current ?? {}, preset)
    const projectModelsPath = projectConfigPath(projectPath, '.codex/models.json')
    const configWithCatalog = preset.modelMetadata
      ? { ...config, model_catalog_json: `${await this.fs.homeDir()}/${projectModelsPath}`.replaceAll('\\', '/') }
      : config
    await scoped.mkdir('.codex')
    await writeTextAtomic(scoped, '.codex/config.toml', serializeCodexConfig(configWithCatalog))
    await writeTextAtomic(scoped, '.codex/auth.json', serializeCodexAuth(mergeCodexAuth(auth, preset)))
    if (preset.modelMetadata) {
      const catalog = await readCodexModels(scoped)
      await writeTextAtomic(scoped, '.codex/models.json', serializeCodexModels(replaceModelCatalog(catalog, preset)))
    }
    await this.saveRecord(projectPath, tool)
    return { projectPath: normalizeProjectPath(projectPath), tool, configPath: projectConfigPath(projectPath, '.codex/config.toml') }
  }

  /** 移除 AISwitch 托管配置项，保留项目文件中的其他用户内容。 */
  async remove(projectPath: string, tool: TargetTool): Promise<ProjectConfigResult> {
    const scoped = projectFs(this.fs, projectPath)
    if (tool === 'claude-code') {
      const path = '.claude/settings.json'
      if (await scoped.exists(path)) {
        const current = await readClaudeSettings(scoped)
        if (current) {
          const stripped = stripManagedClaudeKeys(current)
          await this.writeOrRemove(scoped, path, serializeClaudeSettings(stripped), Object.keys(stripped).length === 0)
        }
      }
      await this.records.remove(normalizeProjectPath(projectPath), tool)
      return { projectPath: normalizeProjectPath(projectPath), tool, configPath: projectConfigPath(projectPath, path) }
    }
    const configPath = '.codex/config.toml'
    const authPath = '.codex/auth.json'
    const config = await readCodexConfig(scoped)
    const home = await this.fs.homeDir()
    const managedCatalogPath = `${home}/${projectConfigPath(projectPath, '.codex/models.json')}`.replaceAll('\\', '/')
    if (config) {
      const stripped = stripManagedCodexConfig(config, managedCatalogPath)
      await this.writeOrRemove(scoped, configPath, serializeCodexConfig(stripped), Object.keys(stripped).length === 0)
    }
    const auth = await readCodexAuth(scoped)
    if (auth !== null) {
      const strippedAuth = stripManagedCodexAuth(auth)
      await this.writeOrRemove(scoped, authPath, strippedAuth ? serializeCodexAuth(strippedAuth) : '', strippedAuth === null)
    }
    // models.json 可能由用户或供应商预先维护，移除项目配置时保守保留，避免误删模型目录。
    await this.records.remove(normalizeProjectPath(projectPath), tool)
    return { projectPath: normalizeProjectPath(projectPath), tool, configPath: projectConfigPath(projectPath, configPath) }
  }

  async detect(projectPath: string, tool: TargetTool): Promise<ToolStatus> {
    const scoped = projectFs(this.fs, projectPath)
    try {
      if (tool === 'claude-code') {
        const config = await readClaudeSettings(scoped)
        return config ? { tool, status: 'installed', activeModel: config.env?.ANTHROPIC_MODEL ?? config.model, activeProviderName: config.env?.ANTHROPIC_BASE_URL ?? '官方 API' } : { tool, status: 'not-configured' }
      }
      const config = await readCodexConfig(scoped)
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
    await writeTextAtomic(fs, path, contents)
  }
}
