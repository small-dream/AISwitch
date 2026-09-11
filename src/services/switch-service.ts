import type { BaselineManager } from '@/adapters/baseline/baseline-manager'
import type { PresetRepository } from '@/adapters/presets/preset-repository'
import { getTarget } from '@/adapters/target-registry'
import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { Preset, TargetTool } from '@/domain/entities/preset'
import type { ApplyResult } from '@/types/config-target'

/** 切换用例：校验预设归属后委托给目标工具适配器（PRD US-03 / US-04） */
export class SwitchService {
  /** 每工具串行链：同一工具的 switch/rollback 排队执行，避免备份→原子写→校验交错（D4） */
  private readonly chains = new Map<TargetTool, Promise<unknown>>()

  constructor(
    private readonly repo: PresetRepository,
    private readonly baselines: BaselineManager
  ) {}

  async switch(tool: TargetTool, presetId: string): Promise<ApplyResult> {
    return this.enqueue(tool, () => this.applySwitch(tool, presetId))
  }

  async rollback(tool: TargetTool): Promise<boolean> {
    return this.enqueue(tool, () => getTarget(tool).rollback())
  }

  /**
   * 追加到该工具的队尾：前序调用无论成败都接续执行。
   * 链上只保存吞掉结果的尾巴，单次失败不会毒化后续调用，也不会产生未处理拒绝。
   */
  private enqueue<T>(tool: TargetTool, task: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(tool) ?? Promise.resolve()
    const run = previous.then(task, task)
    this.chains.set(
      tool,
      run.then(
        () => undefined,
        () => undefined
      )
    )
    return run
  }

  private async applySwitch(tool: TargetTool, presetId: string): Promise<ApplyResult> {
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
