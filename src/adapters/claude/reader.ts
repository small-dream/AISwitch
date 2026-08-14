import { PATHS } from '@/constants/paths'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import type { FileSystemPort } from '@/types/fs-port'
import { parseClaudeSettings } from './transformer'

/** 读取当前 Claude 配置；文件不存在返回 null */
export async function readClaudeSettings(fs: FileSystemPort): Promise<ClaudeSettings | null> {
  if (!(await fs.exists(PATHS.claudeSettings))) {
    return null
  }
  const text = await fs.readTextFile(PATHS.claudeSettings)
  return parseClaudeSettings(text)
}
