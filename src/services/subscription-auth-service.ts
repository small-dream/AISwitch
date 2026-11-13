import { getTarget } from '@/adapters/target-registry'
import type { TargetTool } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import { AppError } from '@/domain/errors'
import type { ConfigTarget } from '@/types/config-target'

/** 官方订阅登录态查询用例（PRD §5.13）：只读探测，不改写任何配置 */
export class SubscriptionAuthService {
  constructor(private readonly resolve: (tool: TargetTool) => ConfigTarget = getTarget) {}

  status(tool: TargetTool): Promise<SubscriptionAuthStatus> {
    return this.resolve(tool).authStatus()
  }

  /** 启动 CLI 自带登录（Codex 会打开浏览器）；不支持的工具明确拒绝 */
  startLogin(tool: TargetTool): Promise<void> {
    const target = this.resolve(tool)
    if (!target.startSubscriptionLogin) {
      return Promise.reject(
        new AppError('E_TARGET_NOT_SUPPORTED', '该工具暂不支持直接启动登录', { tool })
      )
    }
    return target.startSubscriptionLogin()
  }
}
