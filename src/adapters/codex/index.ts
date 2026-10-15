import { BackupManager } from '@/adapters/backup/backup-manager'
import { CODEX_AUTH_KEYS, CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import { PATHS } from '@/constants/paths'
import { AppError, toAppError, type AppErrorContext } from '@/domain/errors'
import type { Preset, ToolStatus } from '@/domain/entities/preset'
import { codexCatalogAbsolutePath, withCatalogKey } from '@/domain/rules/codex-catalog'
import {
  codexProviderLabel,
  mergeCodexAuth,
  mergeCodexConfig,
  stripManagedCodexAuth,
  stripManagedCodexConfig,
} from '@/domain/rules/codex-merge'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { ApplyResult, ConfigTarget } from '@/types/config-target'
import type { FileSystemPort } from '@/types/fs-port'
import { syncCodexCatalog, verifyCodexCatalog } from './catalog-sync'
import { detectCodexAuth } from './auth-status'
import { readCodexAuth, readCodexConfig } from './reader'
import { writeCodexAuth, writeCodexConfig } from './writer'
import { isRecord } from '@/utils/guards'

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

/** apply 本次实际改写的文件及其备份名；backupName 为 null 表示源文件此前不存在（首次写入） */
interface ManagedFile {
  path: string
  backupName: string | null
}

interface RollbackOutcome {
  /** 至少一个文件从本次备份恢复 */
  restored: boolean
  /** 回滚动作自身失败（文件可能仍处于坏状态，必须向调用方暴露） */
  failed: boolean
}

/** 单文件回滚：有备份恢复本次备份；首次写入则删除本次新建的文件 */
async function rollbackFile(
  fs: FileSystemPort,
  backups: BackupManager,
  file: ManagedFile
): Promise<void> {
  if (file.backupName === null) {
    if (await fs.exists(file.path)) {
      await fs.remove(file.path)
    }
    return
  }
  await backups.restore('codex', file.backupName, file.path)
}

/** 仅回滚本次 apply 实际改写的文件；单文件失败不阻断其余文件，失败汇总进 outcome */
async function rollbackManaged(
  fs: FileSystemPort,
  backups: BackupManager,
  files: readonly ManagedFile[]
): Promise<RollbackOutcome> {
  let restored = false
  let failed = false
  for (const file of files) {
    try {
      await rollbackFile(fs, backups, file)
      restored = restored || file.backupName !== null
    } catch {
      failed = true
    }
  }
  return { restored, failed }
}

/** 保留原错误码，在消息与 context 中如实标注回滚结果（失败绝不谎称已回滚） */
function applyFailure(error: unknown, outcome: RollbackOutcome): AppError {
  const original = toAppError(error, 'E_CONFIG_WRITE', '应用配置失败', { tool: 'codex' })
  const suffix = outcome.failed
    ? '自动回滚也失败，请从备份目录手动恢复'
    : outcome.restored
      ? '已自动回滚'
      : '已清理本次新建的配置文件'
  const context: AppErrorContext = {
    ...original.context,
    rollbackFailed: outcome.failed,
    rolledBack: !outcome.failed && outcome.restored,
  }
  return new AppError(original.code, `${original.message}；${suffix}`, context)
}

/** 清空托管键后的回读校验：托管键一律不存在（用户自有字段忽略） */
async function verifyCodexCleared(fs: FileSystemPort): Promise<boolean> {
  try {
    const config = await readCodexConfig(fs)
    if (config) {
      if (config.model !== undefined || config.model_provider !== undefined) {
        return false
      }
      if (config.model_providers && INJECTED in config.model_providers) {
        return false
      }
      if (config.model_catalog_json === codexCatalogAbsolutePath(await fs.homeDir())) {
        return false
      }
    }
    const auth = await readCodexAuth(fs)
    return !isRecord(auth) || !(CODEX_AUTH_KEYS.apiKey in auth)
  } catch {
    return false
  }
}

/** auth.json 剥离托管键：剥空即删除文件（与 stripManagedCodexAuth 的语义对齐） */
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

/**
 * 交回 CLI（官方订阅，PRD §5.13）：移除托管供应商标识、托管目录指向与 API Key，
 * 保留 ChatGPT tokens 与用户自有字段；两文件都不存在时不写入任何内容。
 */
async function clearManagedCodex(fs: FileSystemPort, backups: BackupManager): Promise<ApplyResult> {
  const config = await readCodexConfig(fs)
  const auth = await readCodexAuth(fs)
  if (!config && !isRecord(auth)) {
    return { tool: 'codex', appliedAt: new Date().toISOString() }
  }
  const home = await fs.homeDir()
  const configBackup = await backups.backup('codex', PATHS.codexConfig)
  const authBackup = await backups.backup('codex', PATHS.codexAuth)
  const managed: ManagedFile[] = [
    { path: PATHS.codexConfig, backupName: configBackup },
    { path: PATHS.codexAuth, backupName: authBackup },
  ]
  try {
    if (config) {
      await writeCodexConfig(fs, stripManagedCodexConfig(config, codexCatalogAbsolutePath(home)))
    }
    await writeClearedAuth(fs, auth)
    if (!(await verifyCodexCleared(fs))) {
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
  // 写 + 校验整体进 try：任何一步失败仅回滚本次实际改写的文件（models.json 未改写则不触碰）
  try {
    const sync = await syncCodexCatalog(fs, backups, preset)
    if (sync.modelsTouched) {
      managed.push({ path: PATHS.codexModels, backupName: sync.modelsBackupName })
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
  }
}

/** Codex CLI 目标工具适配器（config.toml + auth.json 双文件三段式） */
export function createCodexTarget(fs: FileSystemPort): ConfigTarget {
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

    clearManaged() {
      return clearManagedCodex(fs, backups)
    },

    async rollback() {
      const restoredConfig = await backups.restoreLatest('codex', PATHS.codexConfig)
      await backups.restoreLatest('codex', PATHS.codexAuth)
      await backups.restoreLatest('codex', PATHS.codexModels)
      return restoredConfig
    },

    authStatus() {
      return detectCodexAuth(fs)
    },
  }
}
