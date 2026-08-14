import { BackupManager } from '@/adapters/backup/backup-manager'
import { CODEX_AUTH_KEYS, CODEX_CONFIG_KEYS } from '@/constants/config-keys'
import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { Preset, ToolStatus } from '@/domain/entities/preset'
import { codexProviderLabel, mergeCodexAuth, mergeCodexConfig } from '@/domain/rules/codex-merge'
import type { CodexConfig } from '@/domain/schemas/codex-config'
import type { ApplyResult, ConfigTarget } from '@/types/config-target'
import type { FileSystemPort } from '@/types/fs-port'
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
    return isRecord(auth) && auth[CODEX_AUTH_KEYS.apiKey] === preset.apiKey
  } catch {
    return false
  }
}

async function safeRollback(backups: BackupManager): Promise<void> {
  try {
    await backups.restoreLatest('codex', PATHS.codexConfig)
    await backups.restoreLatest('codex', PATHS.codexAuth)
  } catch (error) {
    console.error('自动回滚失败，请从备份目录手动恢复', error)
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

    async apply(preset: Preset): Promise<ApplyResult> {
      if (preset.tool !== 'codex') {
        throw new AppError('E_VALIDATION_FAILED', '预设与目标工具不匹配', {
          presetTool: preset.tool,
        })
      }
      const config = await readCodexConfig(fs)
      const auth = await readCodexAuth(fs)
      await backups.backup('codex', PATHS.codexConfig)
      await backups.backup('codex', PATHS.codexAuth)
      await writeCodexConfig(fs, mergeCodexConfig(config ?? {}, preset))
      await writeCodexAuth(fs, mergeCodexAuth(auth, preset))
      if (!(await verifyCodex(fs, preset))) {
        await safeRollback(backups)
        throw new AppError('E_CONFIG_VERIFY', '切换后回读校验失败，已自动回滚', { tool: 'codex' })
      }
      return { tool: 'codex', appliedAt: new Date().toISOString() }
    },

    verify(preset) {
      return verifyCodex(fs, preset)
    },

    async rollback() {
      const restoredConfig = await backups.restoreLatest('codex', PATHS.codexConfig)
      await backups.restoreLatest('codex', PATHS.codexAuth)
      return restoredConfig
    },
  }
}
