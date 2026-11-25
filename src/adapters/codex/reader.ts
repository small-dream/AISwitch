import { PATHS } from '@/constants/paths'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { FileSystemPort } from '@/types/fs-port'
import { parseCodexAuth, parseCodexConfig, parseCodexModels } from './transformer'

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

/** 读取 models.json 模型目录（宽松解析）；文件不存在返回 null */
export async function readCodexModels(fs: FileSystemPort): Promise<unknown> {
  if (!(await fs.exists(PATHS.codexModels))) {
    return null
  }
  const text = await fs.readTextFile(PATHS.codexModels)
  return parseCodexModels(text)
}

/**
 * 读取 Codex 客户端缓存的官方模型目录（只读提示，用于判断模型是否已内置）。
 * 缓存由客户端维护、结构可能随版本变化，解析失败按「未内置」处理，绝不阻断切换。
 */
export async function readCodexModelsCache(fs: FileSystemPort): Promise<unknown> {
  if (!(await fs.exists(PATHS.codexModelsCache))) {
    return null
  }
  try {
    return JSON.parse(await fs.readTextFile(PATHS.codexModelsCache)) as unknown
  } catch (error) {
    console.warn('读取 Codex 官方模型目录缓存失败，按未内置模型处理', error)
    return null
  }
}
