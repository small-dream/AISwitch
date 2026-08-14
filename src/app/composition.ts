import { createClaudeTarget } from '@/adapters/claude'
import { createCodexTarget } from '@/adapters/codex'
import { tauriFs } from '@/adapters/fs/tauri-fs-port'
import { PresetRepository } from '@/adapters/presets/preset-repository'
import { registerTarget } from '@/adapters/target-registry'
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
