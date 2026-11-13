import type { BaselineManager } from '@/adapters/baseline/baseline-manager'
import type { PresetRepository } from '@/adapters/presets/preset-repository'
import { getTarget } from '@/adapters/target-registry'
import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { Preset, TargetTool } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { subscriptionSwitchBlock } from '@/domain/rules/subscription-switch-guard'
import type { ApplyResult, ClearManagedOptions } from '@/types/config-target'

function readAuthStatus(tool: TargetTool): Promise<SubscriptionAuthStatus> {
  return getTarget(tool).authStatus()
}

/** 切换用例：校验预设归属后委托给目标工具适配器（PRD US-03 / US-04） */
export class SwitchService {
  /** 每工具串行链：同一工具的 switch/rollback 排队执行，避免备份→原子写→校验交错（D4） */
  private readonly chains = new Map<TargetTool, Promise<unknown>>()

  constructor(
    private readonly repo: PresetRepository,
    private readonly baselines: BaselineManager,
    private readonly authStatus: (
      tool: TargetTool
    ) => Promise<SubscriptionAuthStatus> = readAuthStatus
  ) {}

  async switch(tool: TargetTool, presetId: string): Promise<ApplyResult> {
    return this.enqueue(tool, () => this.applySwitch(tool, presetId))
  }

  /** 官方订阅条目（PRD §5.13）：清空该工具的全部托管键，把鉴权与模型都交回 CLI */
  async clearManaged(tool: TargetTool, options: ClearManagedOptions = {}): Promise<ApplyResult> {
    return this.enqueue(tool, async () => {
      const conflicts = (await getTarget(tool).subscriptionConflicts?.()) ?? []
      this.assertNoSubscriptionConflicts(tool, conflicts, options)
      if (conflicts.length > 0 && options.removeConflicts) {
        await this.captureBaseline(tool)
        await this.removeConfirmedConflicts(tool)
      }
      await this.assertSubscriptionLogin(tool)
      await this.captureBaseline(tool)
      const result = await getTarget(tool).clearManaged(options)
      await this.markWritten(tool, result)
      return result
    })
  }

  /** 冲突必须先于登录检查：强制 API 登录时，CLI 登录态本身也可能无法确认 */
  private assertNoSubscriptionConflicts(
    tool: TargetTool,
    conflicts: readonly { key: string; value: string }[],
    options: ClearManagedOptions
  ): void {
    if (conflicts.length === 0 || options.removeConflicts) {
      return
    }
    throw new AppError(
      'E_SUBSCRIPTION_CONFLICT_REQUIRED',
      '检测到 Codex 登录方式冲突，需要用户确认后移除',
      { tool, conflicts }
    )
  }

  private async removeConfirmedConflicts(tool: TargetTool): Promise<void> {
    const target = getTarget(tool)
    const result = await target.removeSubscriptionConflicts?.()
    if (result) {
      await this.markWritten(tool, result)
    }
  }

  /**
   * Codex 的 API Key 与 ChatGPT tokens 共用 auth.json：没有 tokens 就清掉 API Key，
   * Codex 桌面端会直接报「无法加载账号」。此时拒绝切换，让 UI 引导用户先完成登录。
   */
  private async assertSubscriptionLogin(tool: TargetTool): Promise<void> {
    if (tool !== 'codex') {
      return
    }
    const state = subscriptionSwitchBlock(tool, await this.authStatus(tool))
    if (!state) {
      return
    }
    throw new AppError(
      'E_SUBSCRIPTION_LOGIN_REQUIRED',
      state === 'logged-out'
        ? '未检测到 Codex 官方登录态，请先执行 codex login 再切换到官方订阅'
        : '无法确认 Codex 官方登录态，请先执行 codex login status 确认后再切换到官方订阅',
      { tool, state }
    )
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
    await this.captureBaseline(tool)
    const result = await getTarget(tool).apply(preset)
    await this.markWritten(tool, result)
    return result
  }

  /**
   * 记录「应用确实写过这些文件」，作为一键还原删除 `absent` 文件的唯一依据。
   * 与基线捕获同理：证据落盘失败只降级告警，绝不把一次成功的切换改成失败。
   */
  private async markWritten(tool: TargetTool, result: ApplyResult): Promise<void> {
    try {
      await this.baselines.markWritten(tool, result.writtenFiles ?? [])
    } catch (error) {
      console.warn('记录写入证据失败，一键还原将保守跳过相关文件', error)
    }
  }

  /**
   * 首次写入前捕获安装前基线（一键还原的锚点）；
   * 基线是尽力而为的保险，捕获失败只降级告警，不得阻断切换本身。
   */
  private async captureBaseline(tool: TargetTool): Promise<void> {
    try {
      await this.baselines.captureIfAbsent(tool, MANAGED_FILES[tool])
    } catch (error) {
      console.warn('基线捕获失败，一键还原将降级为近似还原', error)
    }
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
