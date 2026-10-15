import type { TargetTool } from '@/domain/entities/preset'

/**
 * 官方订阅登录指引（PRD §5.14）：AISwitch 不代持订阅凭据，
 * 登录一律由 CLI 自己完成（浏览器 OAuth），这里只提供命令与官方文档入口。
 */
export interface SubscriptionLoginGuide {
  /** 终端登录命令（一键复制） */
  command: string
  /** CLI 内的账号 / 状态命令，供用户自行核对登录结果 */
  accountCommand: string
  docUrl: string
}

export const SUBSCRIPTION_LOGIN: Record<TargetTool, SubscriptionLoginGuide> = {
  'claude-code': {
    command: 'claude',
    accountCommand: '/status',
    docUrl: 'https://docs.claude.com/en/docs/claude-code/iam',
  },
  codex: {
    command: 'codex login',
    accountCommand: 'codex login status',
    docUrl: 'https://developers.openai.com/codex/cli/',
  },
}
