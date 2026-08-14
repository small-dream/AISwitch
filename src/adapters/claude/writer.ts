import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { PATHS } from '@/constants/paths'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import type { FileSystemPort } from '@/types/fs-port'
import { serializeClaudeSettings } from './transformer'

export async function writeClaudeSettings(
  fs: FileSystemPort,
  settings: ClaudeSettings
): Promise<void> {
  // 全新环境（如 VS Code 插件用户）可能尚无 ~/.claude 目录
  await fs.mkdir(PATHS.claudeDir)
  await writeTextAtomic(fs, PATHS.claudeSettings, serializeClaudeSettings(settings))
}
