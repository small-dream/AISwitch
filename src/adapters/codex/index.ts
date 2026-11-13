import { BackupManager } from '@/adapters/backup/backup-manager'
import { CODEX_AUTH_KEYS, CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { Preset, ToolStatus } from '@/domain/entities/preset'
import { withCatalogKey } from '@/domain/rules/codex-catalog'
import {
  codexProviderLabel,
  codexProviderUrl,
  mergeCodexAuth,
  mergeCodexConfig,
} from '@/domain/rules/codex-merge'
import { findCodexSubscriptionConflicts } from '@/domain/rules/subscription-switch-conflicts'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { ApplyResult, ConfigTarget } from '@/types/config-target'
import type { CodexCliPort } from '@/types/codex-cli-port'
import type { FileSystemPort } from '@/types/fs-port'
import { syncCodexCatalog, verifyCodexCatalog } from './catalog-sync'
import { detectCodexAuth } from './auth-status'
import { tauriCodexCli } from './cli-status'
import { readCodexAuth, readCodexConfig } from './reader'
import { writeCodexAuth, writeCodexConfig } from './writer'
import { isRecord } from '@/utils/guards'
import { clearManagedCodex, removeCodexSubscriptionConflicts } from './clear-managed'
import { applyFailure, rollbackManaged, type ManagedFile } from './file-transaction'

const INJECTED = CODEX_CONFIG_KEYS.injectedProvider

function configMatches(actual: CodexConfig, expected: CodexConfig): boolean {
  if (actual.model !== expected.model) {
    return false
  }
  if (actual.model_provider !== expected.model_provider) {
    return false
  }
  const actualBlock = actual.model_providers?.[INJECTED]
  const expectedBlock = expected.model_providers?.[INJECTED]
  if (actualBlock?.base_url !== expectedBlock?.base_url) {
    return false
  }
  return actualBlock?.experimental_bearer_token === expectedBlock?.experimental_bearer_token
}

async function detectCodex(fs: FileSystemPort): Promise<ToolStatus> {
  const base = { tool: 'codex' as const }
  try {
    const config = await readCodexConfig(fs)
    if (!config) {
      return { ...base, status: 'not-configured' as const }
    }
    return {
      ...base,
      status: 'installed' as const,
      activeModel: config.model,
      activeProviderName: codexProviderLabel(config),
      activeProviderUrl: codexProviderUrl(config),
    }
  } catch {
    return { ...base, status: 'unknown' as const }
  }
}

async function verifyCodex(fs: FileSystemPort, preset: Preset): Promise<boolean> {
  try {
    const config = await readCodexConfig(fs)
    if (!config) {
      return false
    }
    if (!configMatches(config, mergeCodexConfig({}, preset))) {
      return false
    }
    const auth = await readCodexAuth(fs)
    const authOk = preset.apiKey
      ? isRecord(auth) && auth[CODEX_AUTH_KEYS.apiKey] === preset.apiKey
      : !isRecord(auth) || !(CODEX_AUTH_KEYS.apiKey in auth)
    return authOk && (await verifyCodexCatalog(fs, preset, config))
  } catch {
    return false
  }
}

/** 备份 → 原子写 → 校验；失败时仅回滚本次实际改写的文件，错误码原样保留 */
async function applyCodex(
  fs: FileSystemPort,
  backups: BackupManager,
  preset: Preset
): Promise<ApplyResult> {
  if (preset.tool !== 'codex') {
    throw new AppError('E_VALIDATION_FAILED', '预设与目标工具不匹配', {
      presetTool: preset.tool,
    })
  }
  const config = await readCodexConfig(fs)
  const auth = await readCodexAuth(fs)
  const configBackup = await backups.backup('codex', PATHS.codexConfig)
  const authBackup = await backups.backup('codex', PATHS.codexAuth)
  const managed: ManagedFile[] = [
    { path: PATHS.codexConfig, backupName: configBackup },
    { path: PATHS.codexAuth, backupName: authBackup },
  ]
  // 本次实际改写的文件：models.json 仅在目录同步真的落盘时才计入
  const written: string[] = [PATHS.codexConfig, PATHS.codexAuth]
  // 写 + 校验整体进 try：任何一步失败仅回滚本次实际改写的文件（models.json 未改写则不触碰）
  try {
    const sync = await syncCodexCatalog(fs, backups, preset)
    if (sync.modelsTouched) {
      managed.push({ path: PATHS.codexModels, backupName: sync.modelsBackupName })
      written.push(PATHS.codexModels)
    }
    const merged = withCatalogKey(mergeCodexConfig(config ?? {}, preset), sync.keyAction)
    await writeCodexConfig(fs, merged)
    await writeCodexAuth(fs, mergeCodexAuth(auth, preset))
    if (!(await verifyCodex(fs, preset))) {
      throw new AppError('E_CONFIG_VERIFY', '切换后回读校验失败', { tool: 'codex' })
    }
  } catch (error) {
    const outcome = await rollbackManaged(fs, backups, managed)
    throw applyFailure(error, outcome)
  }
  return {
    tool: 'codex',
    backupPath: configBackup ?? undefined,
    appliedAt: new Date().toISOString(),
    writtenFiles: written,
  }
}

/** Codex CLI 目标工具适配器（config.toml + auth.json 双文件三段式） */
export function createCodexTarget(
  fs: FileSystemPort,
  cli: CodexCliPort = tauriCodexCli
): ConfigTarget {
  const backups = new BackupManager(fs)
  return {
    tool: 'codex',

    detect() {
      return detectCodex(fs)
    },

    apply(preset: Preset): Promise<ApplyResult> {
      return applyCodex(fs, backups, preset)
    },

    verify(preset) {
      return verifyCodex(fs, preset)
    },

    clearManaged(options) {
      return clearManagedCodex(fs, backups, options ?? {})
    },

    async subscriptionConflicts() {
      return findCodexSubscriptionConflicts(await readCodexConfig(fs))
    },

    removeSubscriptionConflicts() {
      return removeCodexSubscriptionConflicts(fs, backups)
    },

    async rollback() {
      const restoredConfig = await backups.restoreLatest('codex', PATHS.codexConfig)
      await backups.restoreLatest('codex', PATHS.codexAuth)
      await backups.restoreLatest('codex', PATHS.codexModels)
      return restoredConfig
    },

    authStatus() {
      return detectCodexAuth(fs, cli)
    },

    startSubscriptionLogin() {
      return cli.startLogin()
    },
  }
}
