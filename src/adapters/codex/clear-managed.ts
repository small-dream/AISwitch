import type { BackupManager } from '@/adapters/backup/backup-manager'
import { CODEX_AUTH_KEYS, CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import { codexCatalogAbsolutePath } from '@/domain/rules/codex-catalog'
import { stripManagedCodexAuth, stripManagedCodexConfig } from '@/domain/rules/codex-merge'
import {
  findCodexSubscriptionConflicts,
  stripCodexSubscriptionConflicts,
  type CodexSubscriptionConflict,
} from '@/domain/rules/subscription-switch-conflicts'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { ApplyResult, ClearManagedOptions } from '@/types/config-target'
import type { FileSystemPort } from '@/types/fs-port'
import { isRecord } from '@/utils/guards'
import { readCodexAuth, readCodexConfig } from './reader'
import { writeCodexAuth, writeCodexConfig } from './writer'
import { applyFailure, rollbackManaged, type ManagedFile } from './file-transaction'

interface ClearPlan {
  removeTopLevelProvider: boolean
  removeInjectedProvider: boolean
  removeManagedCatalog: boolean
  removeApiKey: boolean
}

function resolveClearPlan(
  config: CodexConfig | null,
  auth: unknown,
  managedCatalogPath: string
): ClearPlan {
  const provider = config?.model_provider
  return {
    removeTopLevelProvider:
      provider === CODEX_CONFIG_KEYS.injectedProvider ||
      provider === CODEX_CONFIG_KEYS.officialProvider,
    removeInjectedProvider: Boolean(config?.model_providers?.[CODEX_CONFIG_KEYS.injectedProvider]),
    removeManagedCatalog: config?.model_catalog_json === managedCatalogPath,
    removeApiKey: isRecord(auth) && CODEX_AUTH_KEYS.apiKey in auth,
  }
}

function hasClearWork(plan: ClearPlan, removeConflicts: boolean): boolean {
  return (
    plan.removeTopLevelProvider ||
    plan.removeInjectedProvider ||
    plan.removeManagedCatalog ||
    plan.removeApiKey ||
    removeConflicts
  )
}

function hasConfigWork(plan: ClearPlan, removeConflicts: boolean): boolean {
  return (
    plan.removeTopLevelProvider ||
    plan.removeInjectedProvider ||
    plan.removeManagedCatalog ||
    removeConflicts
  )
}

async function writeClearedAuth(fs: FileSystemPort, auth: unknown): Promise<void> {
  const stripped = stripManagedCodexAuth(auth)
  if (stripped) {
    await writeCodexAuth(fs, stripped)
    return
  }
  if (await fs.exists(PATHS.codexAuth)) {
    await fs.remove(PATHS.codexAuth)
  }
}

function configCleared(
  config: CodexConfig | null,
  plan: ClearPlan,
  conflicts: readonly CodexSubscriptionConflict[]
): boolean {
  if (!config) return true
  if (
    plan.removeTopLevelProvider &&
    (config.model !== undefined || config.model_provider !== undefined)
  ) {
    return false
  }
  if (plan.removeInjectedProvider && config.model_providers?.[CODEX_CONFIG_KEYS.injectedProvider]) {
    return false
  }
  if (plan.removeManagedCatalog && config.model_catalog_json !== undefined) {
    return false
  }
  return !conflicts.some((conflict) => conflict.key in config)
}

async function verifyCleared(
  fs: FileSystemPort,
  plan: ClearPlan,
  conflicts: readonly CodexSubscriptionConflict[]
): Promise<boolean> {
  try {
    const configOk = configCleared(await readCodexConfig(fs), plan, conflicts)
    const auth = await readCodexAuth(fs)
    const authOk = !plan.removeApiKey || !isRecord(auth) || !(CODEX_AUTH_KEYS.apiKey in auth)
    return configOk && authOk
  } catch {
    return false
  }
}

function clearConfig(
  config: CodexConfig,
  conflicts: readonly CodexSubscriptionConflict[],
  removeConflicts: boolean,
  managedCatalogPath: string
): CodexConfig {
  const stripped = stripManagedCodexConfig(config, managedCatalogPath)
  return removeConflicts ? stripCodexSubscriptionConflicts(stripped, conflicts) : stripped
}

/**
 * 交回 CLI（官方订阅，PRD §5.13）：删除托管键；强制 API 登录字段必须经用户确认，
 * 且先备份再删除。用户自建 provider 与其模型选择不会被静默改写。
 */
export async function clearManagedCodex(
  fs: FileSystemPort,
  backups: BackupManager,
  options: ClearManagedOptions
): Promise<ApplyResult> {
  const config = await readCodexConfig(fs)
  const auth = await readCodexAuth(fs)
  const catalogPath = codexCatalogAbsolutePath(await fs.homeDir())
  const conflicts = findCodexSubscriptionConflicts(config)
  if (conflicts.length > 0 && !options.removeConflicts) {
    throw new AppError(
      'E_SUBSCRIPTION_CONFLICT_REQUIRED',
      '检测到 Codex 登录方式冲突，需要用户确认后移除',
      { tool: 'codex', conflicts }
    )
  }
  const plan = resolveClearPlan(config, auth, catalogPath)
  const removeConflicts = options.removeConflicts === true && conflicts.length > 0
  if (!hasClearWork(plan, removeConflicts)) {
    return { tool: 'codex', appliedAt: new Date().toISOString(), writtenFiles: [] }
  }
  return applyClear(fs, backups, { config, auth, conflicts, plan, removeConflicts, catalogPath })
}

/** 用户确认后先解锁登录：只删冲突字段，保留托管键与用户其余配置 */
export async function removeCodexSubscriptionConflicts(
  fs: FileSystemPort,
  backups: BackupManager
): Promise<ApplyResult> {
  const config = await readCodexConfig(fs)
  const conflicts = findCodexSubscriptionConflicts(config)
  if (!config || conflicts.length === 0) {
    return { tool: 'codex', appliedAt: new Date().toISOString(), writtenFiles: [] }
  }
  const backupName = await backups.backup('codex', PATHS.codexConfig)
  const managed: ManagedFile[] = [{ path: PATHS.codexConfig, backupName }]
  const plan: ClearPlan = {
    removeTopLevelProvider: false,
    removeInjectedProvider: false,
    removeManagedCatalog: false,
    removeApiKey: false,
  }
  try {
    await writeCodexConfig(fs, stripCodexSubscriptionConflicts(config, conflicts))
    if (!(await verifyCleared(fs, plan, conflicts))) {
      throw new AppError('E_CONFIG_VERIFY', '登录冲突字段移除后回读校验失败', { tool: 'codex' })
    }
  } catch (error) {
    throw applyFailure(error, await rollbackManaged(fs, backups, managed))
  }
  return {
    tool: 'codex',
    backupPath: backupName ?? undefined,
    appliedAt: new Date().toISOString(),
    writtenFiles: [PATHS.codexConfig],
  }
}

interface BackupState {
  configBackup: string | null
  authBackup: string | null
  managed: ManagedFile[]
}

async function prepareBackups(
  backups: BackupManager,
  writeConfig: boolean,
  removeApiKey: boolean
): Promise<BackupState> {
  const configBackup = writeConfig ? await backups.backup('codex', PATHS.codexConfig) : null
  const authBackup = removeApiKey ? await backups.backup('codex', PATHS.codexAuth) : null
  const managed: ManagedFile[] = []
  if (writeConfig) managed.push({ path: PATHS.codexConfig, backupName: configBackup })
  if (removeApiKey) managed.push({ path: PATHS.codexAuth, backupName: authBackup })
  return { configBackup, authBackup, managed }
}

async function writeCleared(
  fs: FileSystemPort,
  state: {
    config: CodexConfig | null
    auth: unknown
    conflicts: readonly CodexSubscriptionConflict[]
    removeConflicts: boolean
    catalogPath: string
  },
  writeConfig: boolean,
  removeApiKey: boolean
): Promise<void> {
  if (writeConfig && state.config) {
    await writeCodexConfig(
      fs,
      clearConfig(state.config, state.conflicts, state.removeConflicts, state.catalogPath)
    )
  }
  if (removeApiKey) await writeClearedAuth(fs, state.auth)
}

async function applyClear(
  fs: FileSystemPort,
  backups: BackupManager,
  state: {
    config: CodexConfig | null
    auth: unknown
    conflicts: readonly CodexSubscriptionConflict[]
    plan: ClearPlan
    removeConflicts: boolean
    catalogPath: string
  }
): Promise<ApplyResult> {
  const { plan } = state
  const writeConfig = state.config !== null && hasConfigWork(plan, state.removeConflicts)
  const backup = await prepareBackups(backups, writeConfig, plan.removeApiKey)
  try {
    await writeCleared(fs, state, writeConfig, plan.removeApiKey)
    if (!(await verifyCleared(fs, plan, state.removeConflicts ? state.conflicts : []))) {
      throw new AppError('E_CONFIG_VERIFY', '切换后回读校验失败', { tool: 'codex' })
    }
  } catch (error) {
    throw applyFailure(error, await rollbackManaged(fs, backups, backup.managed))
  }
  const writtenFiles: string[] = []
  if (writeConfig) writtenFiles.push(PATHS.codexConfig)
  if (plan.removeApiKey) writtenFiles.push(PATHS.codexAuth)
  return {
    tool: 'codex',
    backupPath: backup.configBackup ?? backup.authBackup ?? undefined,
    appliedAt: new Date().toISOString(),
    writtenFiles,
  }
}
