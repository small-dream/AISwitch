import type { ProjectConfigRecord } from '@/domain/entities/project-config-record'
import type { TargetTool } from '@/domain/entities/preset'
import type { CodexModelCatalogFile } from '@/domain/rules/codex-catalog'
import type { CodexAuthFile } from '@/domain/rules/codex-merge'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { FileSystemPort } from '@/types/fs-port'

/**
 * 项目配置服务所需的文件操作端口（ARCHITECTURE §2.2：服务只依赖端口，不依赖具体适配器）。
 * fs 由服务按项目作用域传入，实现仅转发到具体适配器函数；组合根负责注入。
 */
export interface ProjectConfigOps {
  readClaudeSettings(fs: FileSystemPort): Promise<ClaudeSettings | null>
  serializeClaudeSettings(settings: ClaudeSettings): string
  readCodexConfig(fs: FileSystemPort): Promise<CodexConfig | null>
  readCodexAuth(fs: FileSystemPort): Promise<unknown>
  readCodexModels(fs: FileSystemPort): Promise<unknown>
  serializeCodexConfig(config: CodexConfig): string
  serializeCodexAuth(auth: CodexAuthFile): string
  serializeCodexModels(models: CodexModelCatalogFile): string
  writeTextAtomic(fs: FileSystemPort, path: string, contents: string): Promise<void>
}

/** 项目配置记录存储端口（~/.aiswitch/project-configs.json 的读写） */
export interface ProjectConfigRecordStore {
  list(): Promise<ProjectConfigRecord[]>
  upsert(record: ProjectConfigRecord): Promise<void>
  remove(projectPath: string, tool: TargetTool): Promise<void>
}
