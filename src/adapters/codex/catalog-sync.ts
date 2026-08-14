import { BackupManager } from '@/adapters/backup/backup-manager'
import { PATHS } from '@/constants/paths'
import type { Preset } from '@/domain/entities/preset'
import {
  catalogHasEntry,
  codexCatalogAbsolutePath,
  planCodexCatalog,
  type CatalogKeyAction,
} from '@/domain/rules/codex-catalog'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { FileSystemPort } from '@/types/fs-port'
import { readCodexModels } from './reader'
import { writeCodexModels } from './writer'

/**
 * 切换时同步模型目录：按计划合并 models.json（修改前先备份），返回目录键动作，
 * 由调用方在写 config.toml 时应用（point/remove/keep，见 codex-catalog.ts）。
 */
export async function syncCodexCatalog(
  fs: FileSystemPort,
  backups: BackupManager,
  preset: Preset
): Promise<CatalogKeyAction> {
  const catalog = await readCodexModels(fs)
  const home = await fs.homeDir()
  const plan = planCodexCatalog(catalog, preset, codexCatalogAbsolutePath(home))
  if (plan.modelsFile) {
    await backups.backup('codex', PATHS.codexModels)
    await writeCodexModels(fs, plan.modelsFile)
  }
  return plan.keyAction
}

/** 回读校验目录部分：point → 键值一致且条目存在；remove → 键已移除；keep → 现状保留，不校验 */
export async function verifyCodexCatalog(
  fs: FileSystemPort,
  preset: Preset,
  config: CodexConfig
): Promise<boolean> {
  const catalog = await readCodexModels(fs)
  const home = await fs.homeDir()
  const { keyAction } = planCodexCatalog(catalog, preset, codexCatalogAbsolutePath(home))
  if (keyAction.type === 'keep') {
    return true
  }
  if (keyAction.type === 'remove') {
    return config.model_catalog_json === undefined
  }
  return config.model_catalog_json === keyAction.path && catalogHasEntry(catalog, preset.model)
}
