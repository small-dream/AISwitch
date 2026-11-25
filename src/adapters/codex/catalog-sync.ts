import { BackupManager } from '@/adapters/backup/backup-manager'
import { PATHS } from '@/constants/paths'
import type { Preset } from '@/domain/entities/preset'
import {
  catalogHasEntry,
  codexCatalogAbsolutePath,
  planCodexCatalog,
  type CatalogKeyAction,
  type CodexCatalogPlan,
} from '@/domain/rules/codex-catalog'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { FileSystemPort } from '@/types/fs-port'
import { readCodexModels, readCodexModelsCache } from './reader'
import { writeCodexModels } from './writer'

/**
 * 目录同步结果：keyAction 由调用方在写 config.toml 时应用；
 * modelsTouched/modelsBackupName 记录本次是否改写了 models.json 及其备份名
 * （未改写的文件，失败回滚时不得触碰；null = 源文件此前不存在，回滚应删除新文件）。
 */
export interface CodexCatalogSync {
  keyAction: CatalogKeyAction
  modelsTouched: boolean
  modelsBackupName: string | null
}

/** 读取托管目录 + 官方目录缓存，按当前 config 指针计算目录计划 */
async function resolvePlan(
  fs: FileSystemPort,
  preset: Preset,
  currentPointer?: string
): Promise<{ plan: CodexCatalogPlan; catalog: unknown }> {
  const [catalog, builtinCatalog, home] = await Promise.all([
    readCodexModels(fs),
    readCodexModelsCache(fs),
    fs.homeDir(),
  ])
  const plan = planCodexCatalog({
    catalog,
    preset,
    absCatalogPath: codexCatalogAbsolutePath(home),
    builtinCatalog,
    currentPointer,
  })
  return { plan, catalog }
}

/**
 * 切换时同步模型目录：按计划合并 models.json（修改前先备份），返回目录键动作，
 * 由调用方在写 config.toml 时应用（point/remove/keep，见 codex-catalog.ts）。
 */
export async function syncCodexCatalog(
  fs: FileSystemPort,
  backups: BackupManager,
  preset: Preset,
  currentPointer?: string
): Promise<CodexCatalogSync> {
  const { plan } = await resolvePlan(fs, preset, currentPointer)
  if (!plan.modelsFile) {
    return { keyAction: plan.keyAction, modelsTouched: false, modelsBackupName: null }
  }
  const modelsBackupName = await backups.backup('codex', PATHS.codexModels)
  await writeCodexModels(fs, plan.modelsFile)
  return { keyAction: plan.keyAction, modelsTouched: true, modelsBackupName }
}

/** 回读校验目录部分：point → 键值一致且条目存在；remove → 键已移除；keep → 现状保留，不校验 */
export async function verifyCodexCatalog(
  fs: FileSystemPort,
  preset: Preset,
  config: CodexConfig
): Promise<boolean> {
  const { plan, catalog } = await resolvePlan(fs, preset, config.model_catalog_json)
  const { keyAction } = plan
  if (keyAction.type === 'keep') {
    return true
  }
  if (keyAction.type === 'remove') {
    return config.model_catalog_json === undefined
  }
  return config.model_catalog_json === keyAction.path && catalogHasEntry(catalog, preset.model)
}
