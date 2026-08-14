import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { PATHS } from '@/constants/paths'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import type { FileSystemPort } from '@/types/fs-port'
import { serializeClaudeSettings } from './transformer'

export async function writeClaudeSettings(
  fs: FileSystemPort,
  settings: ClaudeSettings
): Promise<void> {
  await writeTextAtomic(fs, PATHS.claudeSettings, serializeClaudeSettings(settings))
}
