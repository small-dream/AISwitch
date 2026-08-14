import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import { claudeSettingsSchema, type ClaudeSettings } from '@/domain/schemas/claude-config'

export function parseClaudeSettings(raw: string): ClaudeSettings {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new AppError('E_CONFIG_PARSE', 'Claude 配置不是合法 JSON', { path: PATHS.claudeSettings })
  }
  const result = claudeSettingsSchema.safeParse(value)
  if (!result.success) {
    throw new AppError('E_CONFIG_PARSE', 'Claude 配置结构不符合预期', {
      path: PATHS.claudeSettings,
    })
  }
  return result.data
}

export function serializeClaudeSettings(settings: ClaudeSettings): string {
  return `${JSON.stringify(settings, null, 2)}\n`
}
