import { createClaudeTarget } from '@/adapters/claude'
import { createCodexTarget } from '@/adapters/codex'
import { ConnectivityProber } from '@/adapters/connectivity/http-prober'
import { tauriHttp } from '@/adapters/connectivity/tauri-http'
import { BackupManager } from '@/adapters/backup/backup-manager'
import { BaselineManager } from '@/adapters/baseline/baseline-manager'
import { BundleRepository } from '@/adapters/bundles/bundle-repository'
import { tauriFs } from '@/adapters/fs/tauri-fs-port'
import { PresetRepository } from '@/adapters/presets/preset-repository'
import { registerTarget } from '@/adapters/target-registry'
import { detectVscodeExtensions } from '@/adapters/vscode/vscode-detector'
import { readClaudeSettings } from '@/adapters/claude/reader'
import { readCodexAuth, readCodexConfig, readCodexModels } from '@/adapters/codex/reader'
import { BackupService } from '@/services/backup-service'
import { BundleService } from '@/services/bundle-service'
import { ConnectivityService } from '@/services/connectivity-service'
import { ImportService } from '@/services/import-service'
import { PresetService } from '@/services/preset-service'
import { RestoreService } from '@/services/restore-service'
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
export const backupManager = new BackupManager(tauriFs)
export const baselineManager = new BaselineManager(tauriFs, backupManager)
export const switchService = new SwitchService(presetRepository, baselineManager)
export const bundleRepository = new BundleRepository(tauriFs)
export const bundleService = new BundleService(bundleRepository, presetRepository, switchService)
export const connectivityService = new ConnectivityService(new ConnectivityProber(tauriHttp))
export const importService = new ImportService({
  readClaude: () => readClaudeSettings(tauriFs),
  readCodexConfig: () => readCodexConfig(tauriFs),
  readCodexAuth: () => readCodexAuth(tauriFs),
  readCodexModels: () => readCodexModels(tauriFs),
})
export const backupService = new BackupService(backupManager)
export const restoreService = new RestoreService({
  fs: tauriFs,
  baselines: baselineManager,
  backups: backupService,
})
export const vscodePresenceService = {
  detect: () => detectVscodeExtensions(tauriFs),
}
