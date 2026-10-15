import type { TargetTool } from '@/domain/entities/preset'

/** TanStack Query 缓存键（唯一事实来源） */
export const QUERY_KEYS = {
  presets: ['presets'] as const,
  toolStatus: ['tool-status'] as const,
  backups: ['backups'] as const,
  restorePlan: ['restore-plan'] as const,
  appVersion: ['app-version'] as const,
  /** 官方订阅登录态（PRD §5.13）；前缀即 subscriptionAuthRoot，切换后按前缀整体失效 */
  subscriptionAuthRoot: ['subscription-auth'] as const,
  subscriptionAuth: (tool: TargetTool) => ['subscription-auth', tool] as const,
}
