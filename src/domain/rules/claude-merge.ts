import { CLAUDE_ENV_KEYS, CLAUDE_SLOT_KEYS } from '@/constants/config-keys'
import type { Preset } from '@/domain/entities/preset'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'

type EnvMap = Record<string, string>

const SLOT_KEYS = [CLAUDE_SLOT_KEYS.haiku, CLAUDE_SLOT_KEYS.sonnet, CLAUDE_SLOT_KEYS.opus] as const

/** 槽位映射模式：env 中存在任一 DEFAULT_*_MODEL 槽位键 */
export function isSlotModeEnv(env: EnvMap | undefined): boolean {
  if (!env) {
    return false
  }
  return SLOT_KEYS.some((key) => key in env)
}

function setOrDelete(env: EnvMap, key: string, value: string | undefined): void {
  if (value === undefined || value === '') {
    Reflect.deleteProperty(env, key)
  } else {
    env[key] = value
  }
}

function applyPreset(env: EnvMap, preset: Preset, slotMode: boolean): EnvMap {
  const next = { ...env }
  next[CLAUDE_ENV_KEYS.authToken] = preset.apiKey
  next[CLAUDE_ENV_KEYS.model] = preset.model
  setOrDelete(next, CLAUDE_ENV_KEYS.baseUrl, preset.baseUrl)
  setOrDelete(next, CLAUDE_ENV_KEYS.smallFastModel, preset.smallFastModel)
  if (slotMode) {
    // 槽位映射模式下三槽位必须同步覆盖，否则 Claude Code 仍按旧槽位模型运行
    next[CLAUDE_SLOT_KEYS.sonnet] = preset.model
    next[CLAUDE_SLOT_KEYS.opus] = preset.model
    next[CLAUDE_SLOT_KEYS.haiku] = preset.smallFastModel ?? preset.model
  }
  return next
}

/** 应用预设后的期望 env（verify 对比基线；slotMode 需与目标文件实际模式一致） */
export function expectedClaudeEnv(preset: Preset, slotMode: boolean): EnvMap {
  return applyPreset({}, preset, slotMode)
}

/** 合并预设到现有 settings：仅覆盖受管键，其余字段原样保留（PRD §5.1） */
export function mergeClaudeSettings(current: ClaudeSettings, preset: Preset): ClaudeSettings {
  const slotMode = isSlotModeEnv(current.env)
  return { ...current, env: applyPreset(current.env ?? {}, preset, slotMode) }
}
