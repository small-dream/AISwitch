import { readClaudeSettings } from '@/adapters/claude/reader'
import { writeClaudeSettings } from '@/adapters/claude/writer'
import { readCodexAuth, readCodexConfig } from '@/adapters/codex/reader'
import { writeCodexAuth, writeCodexConfig } from '@/adapters/codex/writer'
import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import type { RestoreFileOps } from '@/types/restore-file-ops'

/**
 * 一键还原文件操作端口实现：转发到 Claude/Codex 具体适配器。
 * fs 由服务注入（还原始终作用于 HOME，组合根传 tauriFs），因此此处不做绑定。
 */
export const restoreFileOps: RestoreFileOps = {
  writeTextAtomic,
  readClaudeSettings,
  writeClaudeSettings,
  readCodexConfig,
  writeCodexConfig,
  readCodexAuth,
  writeCodexAuth,
}
