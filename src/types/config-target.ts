import type { Preset, TargetTool, ToolStatus } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import type { CodexSubscriptionConflict } from '@/domain/rules/subscription-switch-conflicts'

export interface ClearManagedOptions {
  /** 用户已确认移除冲突字段；仅在备份完成后删除 */
  removeConflicts?: boolean
}

export interface ApplyResult {
  tool: TargetTool
  backupPath?: string
  appliedAt: string
  /**
   * 本次实际写入（或删除）的受管文件，相对 HOME 的正斜杠路径。
   * 由 SwitchService 转交 BaselineManager 记为「应用写过」，是一键还原执行删除的唯一依据。
   */
  writtenFiles?: readonly string[]
}

/**
 * 目标工具统一契约（策略模式核心，ARCHITECTURE §2.3 D1）。
 * 新增 CLI 支持时实现本接口并注册，既有代码零修改。
 */
export interface ConfigTarget {
  readonly tool: TargetTool
  /** 探测安装状态与当前生效配置 */
  detect(): Promise<ToolStatus>
  /** 备份 → 原子写入 → 校验，三段式（D4） */
  apply(preset: Preset): Promise<ApplyResult>
  /** 回读配置文件，校验预设是否已生效 */
  verify(preset: Preset): Promise<boolean>
  /** 从最近一份备份恢复；无可用备份返回 false */
  rollback(): Promise<boolean>
  /**
   * 交回 CLI：删除 AISwitch 写入的全部托管键（保留用户自有配置），
   * 与 apply 共用「备份 → 原子写 → 校验」三段式。官方订阅条目即调它（PRD §5.13）。
   */
  clearManaged(options?: ClearManagedOptions): Promise<ApplyResult>
  /** 切换官方订阅前只读检查用户配置冲突（无冲突的工具可省略） */
  subscriptionConflicts?(): Promise<readonly CodexSubscriptionConflict[]>
  /** 用户确认后只移除冲突字段（先备份；不触碰托管键），供登录检查前解锁 CLI 登录 */
  removeSubscriptionConflicts?(): Promise<ApplyResult>
  /** 官方订阅登录态探测（PRD §5.13）：只读，不修改任何配置 */
  authStatus(): Promise<SubscriptionAuthStatus>
}
