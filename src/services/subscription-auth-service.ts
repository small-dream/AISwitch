import { getTarget } from '@/adapters/target-registry'
import type { TargetTool } from '@/domain/entities/preset'
import type { SubscriptionAuthStatus } from '@/domain/entities/subscription-auth'
import type { ConfigTarget } from '@/types/config-target'

/** 官方订阅登录态查询用例（PRD §5.14）：只读探测，不改写任何配置 */
export class SubscriptionAuthService {
  constructor(private readonly resolve: (tool: TargetTool) => ConfigTarget = getTarget) {}

  status(tool: TargetTool): Promise<SubscriptionAuthStatus> {
    return this.resolve(tool).authStatus()
  }
}
