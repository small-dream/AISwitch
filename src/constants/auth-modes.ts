import type { AuthMode } from '@/domain/entities/preset'

/** 认证方式全集：顺序即表单选项顺序（keyless = 使用 CLI 自带官方订阅登录态） */
export const AUTH_MODES: readonly AuthMode[] = ['api-key', 'subscription']
