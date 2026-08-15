/**
 * 全部路径为相对用户主目录（HOME）的正斜杠相对路径，
 * 由 FileSystemPort 实现负责平台差异转换（ARCHITECTURE §2.3 D3）。
 */
export const PATHS = {
  claudeDir: '.claude',
  claudeSettings: '.claude/settings.json',
  codexDir: '.codex',
  codexConfig: '.codex/config.toml',
  codexAuth: '.codex/auth.json',
  codexModels: '.codex/models.json',
  appDir: '.aiswitch',
  presetsFile: '.aiswitch/presets.json',
  backupsDir: '.aiswitch/backups',
  baselineDir: '.aiswitch/baseline',
} as const
