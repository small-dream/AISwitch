import { readClaudeSettings } from '@/adapters/claude/reader'
import { serializeClaudeSettings } from '@/adapters/claude/transformer'
import { readCodexAuth, readCodexConfig, readCodexModels } from '@/adapters/codex/reader'
import {
  serializeCodexAuth,
  serializeCodexConfig,
  serializeCodexModels,
} from '@/adapters/codex/transformer'
import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { ProjectConfigRepository } from '@/adapters/projects/project-config-repository'
import type { FileSystemPort } from '@/types/fs-port'
import type { ProjectConfigOps, ProjectConfigRecordStore } from '@/types/project-config-ops'

/**
 * 项目配置文件操作端口实现：转发到 Claude/Codex 具体适配器。
 * fs 由调用方按项目作用域传入（可能非 tauriFs），因此此处不做绑定。
 */
export const projectConfigOps: ProjectConfigOps = {
  readClaudeSettings,
  serializeClaudeSettings,
  readCodexConfig,
  readCodexAuth,
  readCodexModels,
  serializeCodexConfig,
  serializeCodexAuth,
  serializeCodexModels,
  writeTextAtomic,
}

/** 项目配置记录存储端口实现：绑定到给定 fs 的具体仓库 */
export function createProjectConfigRecordStore(fs: FileSystemPort): ProjectConfigRecordStore {
  return new ProjectConfigRepository(fs)
}
