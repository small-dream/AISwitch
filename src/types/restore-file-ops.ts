import type { CodexAuthFile } from '@/domain/rules/codex-merge'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { FileSystemPort } from '@/types/fs-port'

/**
 * 一键还原服务所需的文件操作端口（ARCHITECTURE §2.2：服务只依赖端口，不依赖具体适配器）。
 * 组合根注入绑定到具体 Claude/Codex 适配器的实现。
 */
export interface RestoreFileOps {
  writeTextAtomic(fs: FileSystemPort, path: string, contents: string): Promise<void>
  readClaudeSettings(fs: FileSystemPort): Promise<ClaudeSettings | null>
  writeClaudeSettings(fs: FileSystemPort, settings: ClaudeSettings): Promise<void>
  readCodexConfig(fs: FileSystemPort): Promise<CodexConfig | null>
  writeCodexConfig(fs: FileSystemPort, config: CodexConfig): Promise<void>
  readCodexAuth(fs: FileSystemPort): Promise<unknown>
  writeCodexAuth(fs: FileSystemPort, auth: CodexAuthFile): Promise<void>
}
