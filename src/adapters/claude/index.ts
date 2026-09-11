import { BackupManager } from '@/adapters/backup/backup-manager'
import {
  CLAUDE_ENV_KEYS,
  CLAUDE_MANAGED_ENV_KEYS,
  CLAUDE_SLOT_KEYS,
} from '@/constants/config-keys'
import { PATHS } from '@/constants/paths'
import { AppError, toAppError, type AppErrorContext } from '@/domain/errors'
import type { Preset, TargetTool, ToolStatus } from '@/domain/entities/preset'
import { expectedClaudeEnv, isSlotModeEnv, mergeClaudeSettings } from '@/domain/rules/claude-merge'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import type { ApplyResult, ConfigTarget } from '@/types/config-target'
import type { FileSystemPort } from '@/types/fs-port'
import { readClaudeSettings } from './reader'
import { writeClaudeSettings } from './writer'

/** 托管键清单唯一事实来源见 constants/config-keys.ts（与一键还原剥离共用） */
const MANAGED_ENV_KEYS = CLAUDE_MANAGED_ENV_KEYS

/** 当前生效模型：ANTHROPIC_MODEL → 槽位键（中转场景）→ 顶层 model（原生） */
export function activeClaudeModel(settings: ClaudeSettings): string | undefined {
  const env = settings.env ?? {}
  return (
    env[CLAUDE_ENV_KEYS.model] ??
    env[CLAUDE_SLOT_KEYS.sonnet] ??
    env[CLAUDE_SLOT_KEYS.opus] ??
    env[CLAUDE_SLOT_KEYS.haiku] ??
    settings.model
  )
}

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
      activeModel: activeClaudeModel(settings),
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
    const expected = expectedClaudeEnv(preset, isSlotModeEnv(settings.env))
    return envMatches(settings.env ?? {}, expected)
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
  tool: TargetTool,
  file: ManagedFile
): Promise<void> {
  if (file.backupName === null) {
    if (await fs.exists(file.path)) {
      await fs.remove(file.path)
    }
    return
  }
  await backups.restore(tool, file.backupName, file.path)
}

/** 逐文件回滚本次 apply 的改动；单文件失败不阻断其余文件，失败汇总进 outcome */
async function rollbackManaged(
  fs: FileSystemPort,
  backups: BackupManager,
  tool: TargetTool,
  files: readonly ManagedFile[]
): Promise<RollbackOutcome> {
  let restored = false
  let failed = false
  for (const file of files) {
    try {
      await rollbackFile(fs, backups, tool, file)
      restored = restored || file.backupName !== null
    } catch {
      failed = true
    }
  }
  return { restored, failed }
}

/** 保留原错误码，在消息与 context 中如实标注回滚结果（失败绝不谎称已回滚） */
function applyFailure(error: unknown, tool: TargetTool, outcome: RollbackOutcome): AppError {
  const original = toAppError(error, 'E_CONFIG_WRITE', '应用配置失败', { tool })
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
      // 写 + 校验整体进 try：任何一步失败都回滚本次改动（含写半截的部分状态）
      try {
        const merged = mergeClaudeSettings(current ?? {}, preset)
        await writeClaudeSettings(fs, merged)
        if (!(await verifyClaude(fs, preset))) {
          throw new AppError('E_CONFIG_VERIFY', '切换后回读校验失败', { tool: 'claude-code' })
        }
      } catch (error) {
        const outcome = await rollbackManaged(fs, backups, 'claude-code', [
          { path: PATHS.claudeSettings, backupName },
        ])
        throw applyFailure(error, 'claude-code', outcome)
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
