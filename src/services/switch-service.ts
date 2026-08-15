import type { BaselineManager } from '@/adapters/baseline/baseline-manager'
import type { PresetRepository } from '@/adapters/presets/preset-repository'
import { getTarget } from '@/adapters/target-registry'
import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { Preset, TargetTool } from '@/domain/entities/preset'
import type { ApplyResult } from '@/types/config-target'

/** 切换用例：校验预设归属后委托给目标工具适配器（PRD US-03 / US-04） */
export class SwitchService {
  constructor(
    private readonly repo: PresetRepository,
    private readonly baselines: BaselineManager
  ) {}

  async switch(tool: TargetTool, presetId: string): Promise<ApplyResult> {
    const preset = await this.findPreset(tool, presetId)
    // 首次写入前捕获安装前基线（一键还原的锚点）；
    // 基线是尽力而为的保险，捕获失败只降级告警，不得阻断切换本身
    try {
      await this.baselines.captureIfAbsent(tool, MANAGED_FILES[tool])
    } catch (error) {
      console.warn('基线捕获失败，一键还原将降级为近似还原', error)
    }
    return getTarget(tool).apply(preset)
  }

  async rollback(tool: TargetTool): Promise<boolean> {
    return getTarget(tool).rollback()
  }

  private async findPreset(tool: TargetTool, presetId: string): Promise<Preset> {
    const presets = await this.repo.list()
    const preset = presets.find((item) => item.id === presetId)
    if (!preset) {
      throw new AppError('E_PRESET_NOT_FOUND', '预设不存在', { presetId })
    }
    if (preset.tool !== tool) {
      throw new AppError('E_VALIDATION_FAILED', '预设与目标工具不匹配', {
        tool,
        presetTool: preset.tool,
      })
    }
    return preset
  }
}

/** 每个工具受基线监控的配置文件（与 BACKUP_FILES 对齐） */
export const MANAGED_FILES: Record<TargetTool, readonly string[]> = {
  'claude-code': [PATHS.claudeSettings],
  codex: [PATHS.codexConfig, PATHS.codexAuth, PATHS.codexModels],
}
