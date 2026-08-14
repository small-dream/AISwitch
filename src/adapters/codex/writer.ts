import { writeTextAtomic } from '@/adapters/fs/atomic-write'
import { PATHS } from '@/constants/paths'
import type { CodexAuthFile } from '@/domain/rules/codex-merge'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { FileSystemPort } from '@/types/fs-port'
import { serializeCodexAuth, serializeCodexConfig } from './transformer'

export async function writeCodexConfig(fs: FileSystemPort, config: CodexConfig): Promise<void> {
  // 全新环境可能尚无 ~/.codex 目录
  await fs.mkdir(PATHS.codexDir)
  await writeTextAtomic(fs, PATHS.codexConfig, serializeCodexConfig(config))
}

export async function writeCodexAuth(fs: FileSystemPort, auth: CodexAuthFile): Promise<void> {
  await fs.mkdir(PATHS.codexDir)
  await writeTextAtomic(fs, PATHS.codexAuth, serializeCodexAuth(auth))
}
