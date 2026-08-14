import { CLAUDE_ENV_KEYS } from '@/constants/config-keys'
import type { Preset } from '@/domain/entities/preset'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'

type EnvMap = Record<string, string>

function setOrDelete(env: EnvMap, key: string, value: string | undefined): void {
  if (value === undefined || value === '') {
    Reflect.deleteProperty(env, key)
  } else {
    env[key] = value
  }
}

function applyPreset(env: EnvMap, preset: Preset): EnvMap {
  const next = { ...env }
  next[CLAUDE_ENV_KEYS.authToken] = preset.apiKey
  next[CLAUDE_ENV_KEYS.model] = preset.model
  setOrDelete(next, CLAUDE_ENV_KEYS.baseUrl, preset.baseUrl)
  setOrDelete(next, CLAUDE_ENV_KEYS.smallFastModel, preset.smallFastModel)
  return next
}

/** 应用预设后的期望 env（空基线合并，用于写后 verify 对比） */
export function expectedClaudeEnv(preset: Preset): EnvMap {
  return applyPreset({}, preset)
}

/** 合并预设到现有 settings：仅覆盖 PRD §5.1 所列键，其余字段原样保留 */
export function mergeClaudeSettings(current: ClaudeSettings, preset: Preset): ClaudeSettings {
  return { ...current, env: applyPreset(current.env ?? {}, preset) }
}
