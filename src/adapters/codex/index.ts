import { BackupManager } from '@/adapters/backup/backup-manager'
import { CODEX_AUTH_KEYS, CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import { PATHS } from '@/constants/paths'
import { AppError, toAppError, type AppErrorContext } from '@/domain/errors'
import type { Preset, ToolStatus } from '@/domain/entities/preset'
import { withCatalogKey } from '@/domain/rules/codex-catalog'
import { codexProviderLabel, mergeCodexAuth, mergeCodexConfig } from '@/domain/rules/codex-merge'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { ApplyResult, ConfigTarget } from '@/types/config-target'
import type { FileSystemPort } from '@/types/fs-port'
import { syncCodexCatalog, verifyCodexCatalog } from './catalog-sync'
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

    async rollback() {
      const restoredConfig = await backups.restoreLatest('codex', PATHS.codexConfig)
      await backups.restoreLatest('codex', PATHS.codexAuth)
      await backups.restoreLatest('codex', PATHS.codexModels)
      return restoredConfig
    },
  }
}
