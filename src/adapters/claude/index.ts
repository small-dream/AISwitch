import { BackupManager } from '@/adapters/backup/backup-manager'
import { CLAUDE_ENV_KEYS } from '@/constants/config-keys'
import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { Preset, ToolStatus } from '@/domain/entities/preset'
import { expectedClaudeEnv, mergeClaudeSettings } from '@/domain/rules/claude-merge'
import type { ApplyResult, ConfigTarget } from '@/types/config-target'
import type { FileSystemPort } from '@/types/fs-port'
import { readClaudeSettings } from './reader'
import { writeClaudeSettings } from './writer'

const MANAGED_ENV_KEYS = [
  CLAUDE_ENV_KEYS.authToken,
  CLAUDE_ENV_KEYS.model,
  CLAUDE_ENV_KEYS.baseUrl,
  CLAUDE_ENV_KEYS.smallFastModel,
] as const

/** 逐键校验：期望键必须相等，被删除的受管键必须不存在，用户自有键（如 OTHER_KEY）忽略 */
function envMatches(actual: Record<string, string>, expected: Record<string, string>): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      return false
    }
  }
  for (const key of MANAGED_ENV_KEYS) {
    if (!(key in expected) && key in actual) {
      return false
    }
  }
  return true
}

async function detectClaude(fs: FileSystemPort): Promise<ToolStatus> {
  const base = { tool: 'claude-code' as const }
  try {
    const settings = await readClaudeSettings(fs)
    if (!settings) {
      return { ...base, status: 'not-configured' as const }
    }
    const env = settings.env ?? {}
    return {
      ...base,
      status: 'installed' as const,
      activeModel: env[CLAUDE_ENV_KEYS.model],
      activeProviderName: env[CLAUDE_ENV_KEYS.baseUrl] ?? '官方 API',
    }
  } catch {
    // 解析失败按 PRD §5.5 归为 unknown，由 UI 提示
    return { ...base, status: 'unknown' as const }
  }
}

async function verifyClaude(fs: FileSystemPort, preset: Preset): Promise<boolean> {
  try {
    const settings = await readClaudeSettings(fs)
    if (!settings) {
      return false
    }
    return envMatches(settings.env ?? {}, expectedClaudeEnv(preset))
  } catch {
    return false
  }
}

async function safeRollback(backups: BackupManager): Promise<void> {
  try {
    await backups.restoreLatest('claude-code', PATHS.claudeSettings)
  } catch (error) {
    console.error('自动回滚失败，请从备份目录手动恢复', error)
  }
}

/** Claude Code 目标工具适配器（备份 → 原子写 → 校验，三段式） */
export function createClaudeTarget(fs: FileSystemPort): ConfigTarget {
  const backups = new BackupManager(fs)
  return {
    tool: 'claude-code',

    detect() {
      return detectClaude(fs)
    },

    async apply(preset: Preset): Promise<ApplyResult> {
      if (preset.tool !== 'claude-code') {
        throw new AppError('E_VALIDATION_FAILED', '预设与目标工具不匹配', {
          presetTool: preset.tool,
        })
      }
      const current = await readClaudeSettings(fs)
      const backupName = await backups.backup('claude-code', PATHS.claudeSettings)
      const merged = mergeClaudeSettings(current ?? {}, preset)
      await writeClaudeSettings(fs, merged)
      if (!(await verifyClaude(fs, preset))) {
        await safeRollback(backups)
        throw new AppError('E_CONFIG_VERIFY', '切换后回读校验失败，已自动回滚', {
          tool: 'claude-code',
        })
      }
      return {
        tool: 'claude-code',
        backupPath: backupName ?? undefined,
        appliedAt: new Date().toISOString(),
      }
    },

    verify(preset) {
      return verifyClaude(fs, preset)
    },

    rollback() {
      return backups.restoreLatest('claude-code', PATHS.claudeSettings)
    },
  }
}
