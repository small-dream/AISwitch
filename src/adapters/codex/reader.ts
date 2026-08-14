import { PATHS } from '@/constants/paths'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { FileSystemPort } from '@/types/fs-port'
import { parseCodexAuth, parseCodexConfig } from './transformer'

/** 读取 config.toml；文件不存在返回 null */
export async function readCodexConfig(fs: FileSystemPort): Promise<CodexConfig | null> {
  if (!(await fs.exists(PATHS.codexConfig))) {
    return null
  }
  const text = await fs.readTextFile(PATHS.codexConfig)
  return parseCodexConfig(text)
}

/** 读取 auth.json（宽松解析，返回 unknown 交由合并规则收窄）；文件不存在返回 null */
export async function readCodexAuth(fs: FileSystemPort): Promise<unknown> {
  if (!(await fs.exists(PATHS.codexAuth))) {
    return null
  }
  const text = await fs.readTextFile(PATHS.codexAuth)
  return parseCodexAuth(text)
}
