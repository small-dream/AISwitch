import type { Preset, TargetTool, ToolStatus } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'

export interface ApplyResult {
  tool: TargetTool
  backupPath?: string
  appliedAt: string
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
  /** 官方订阅登录态探测（PRD §5.14）：只读，不修改任何配置 */
  authStatus(): Promise<SubscriptionAuthStatus>
}
