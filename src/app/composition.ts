import { createClaudeTarget } from '@/adapters/claude'
import { createCodexTarget } from '@/adapters/codex'
import { ConnectivityProber } from '@/adapters/connectivity/http-prober'
import { tauriHttp } from '@/adapters/connectivity/tauri-http'
import { BackupManager } from '@/adapters/backup/backup-manager'
import { tauriFs } from '@/adapters/fs/tauri-fs-port'
import { PresetRepository } from '@/adapters/presets/preset-repository'
import { registerTarget } from '@/adapters/target-registry'
import { detectVscodeExtensions } from '@/adapters/vscode/vscode-detector'
import { readClaudeSettings } from '@/adapters/claude/reader'
import { readCodexAuth, readCodexConfig } from '@/adapters/codex/reader'
import { BackupService } from '@/services/backup-service'
import { ConnectivityService } from '@/services/connectivity-service'
import { ImportService } from '@/services/import-service'
import { PresetService } from '@/services/preset-service'
import { SwitchService } from '@/services/switch-service'

/**
 * 应用组合根：全项目唯一允许同时接触「具体实现」的位置。
 * 新增目标工具时在此追加一行注册（ARCHITECTURE §9）。
 */
let bootstrapped = false

export function bootstrapApp(): void {
  if (bootstrapped) {
    return
  }
  bootstrapped = true
  registerTarget(createClaudeTarget(tauriFs))
  registerTarget(createCodexTarget(tauriFs))
}

export const presetRepository = new PresetRepository(tauriFs)
export const presetService = new PresetService(presetRepository)
export const switchService = new SwitchService(presetRepository)
export const connectivityService = new ConnectivityService(new ConnectivityProber(tauriHttp))
export const importService = new ImportService({
  readClaude: () => readClaudeSettings(tauriFs),
  readCodexConfig: () => readCodexConfig(tauriFs),
  readCodexAuth: () => readCodexAuth(tauriFs),
})
export const backupService = new BackupService(new BackupManager(tauriFs))
export const vscodePresenceService = {
  detect: () => detectVscodeExtensions(tauriFs),
}
