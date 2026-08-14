import type { PresetRepository } from '@/adapters/presets/preset-repository'
import { getTarget } from '@/adapters/target-registry'
import { AppError } from '@/domain/errors'
import type { Preset, TargetTool } from '@/domain/entities/preset'
import type { ApplyResult } from '@/types/config-target'

/** 切换用例：校验预设归属后委托给目标工具适配器（PRD US-03 / US-04） */
export class SwitchService {
  constructor(private readonly repo: PresetRepository) {}

  async switch(tool: TargetTool, presetId: string): Promise<ApplyResult> {
    const preset = await this.findPreset(tool, presetId)
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
