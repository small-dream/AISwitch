import { CLAUDE_ENV_KEYS } from '@/constants/config-keys'
import type { TargetTool, ToolStatus } from '@/domain/entities/preset'
import { codexProviderUrl } from '@/domain/rules/codex-merge'
import type { ClaudeSettings } from '@/domain/schemas/claude-config'
import type { CodexConfig } from '@/domain/schemas/codex-config'

/**
 * 项目级配置 → 探测状态（纯映射）。
 * 与全局 detect 同源：展示名给用户看，`activeProviderUrl` 供「当前生效」判定，
 * 二者不能混用——展示名可能是块内任意 `name`。
 */
export function claudeProjectStatus(tool: TargetTool, config: ClaudeSettings): ToolStatus {
  const baseUrl = config.env?.[CLAUDE_ENV_KEYS.baseUrl]
  return {
    tool,
    status: 'installed',
    activeModel: config.env?.[CLAUDE_ENV_KEYS.model] ?? config.model,
    activeProviderName: baseUrl ?? '官方 API',
    activeProviderUrl: baseUrl,
  }
}

export function codexProjectStatus(tool: TargetTool, config: CodexConfig): ToolStatus {
  return {
    tool,
    status: 'installed',
    activeModel: config.model,
    activeProviderName: config.model_provider,
    activeProviderUrl: codexProviderUrl(config),
  }
}
