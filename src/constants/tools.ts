import type { TargetTool } from '@/domain/entities/preset'

export const TARGET_TOOLS: readonly TargetTool[] = ['claude-code', 'codex']

export const TOOL_META: Record<TargetTool, { label: string; configPath: string }> = {
  'claude-code': { label: 'Claude Code', configPath: '~/.claude/settings.json' },
  codex: { label: 'Codex CLI', configPath: '~/.codex/config.toml + auth.json' },
}
