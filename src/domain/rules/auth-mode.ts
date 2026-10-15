import type { AuthMode, Preset, PresetInput } from '@/domain/entities/preset'

/** 是否使用 CLI 自带的官方订阅登录态（PRD §5.14） */
export function isSubscriptionAuth(preset: Pick<Preset, 'authMode'>): boolean {
  return preset.authMode === 'subscription'
}

/**
 * 导入当前配置时的默认认证方式：既无中转地址也无密钥 ⇒ 该配置正在使用 CLI 的官方登录态，
 * 因此按订阅模式建草稿（用户仍可在表单里改回 API Key 模式）。
 */
export function defaultAuthMode(baseUrl: string | undefined, apiKey: string | undefined): AuthMode {
  return baseUrl || apiKey ? 'api-key' : 'subscription'
}

/** 订阅模式一律丢弃 baseUrl / apiKey：写入它们会顶掉 CLI 的登录态（PRD §5.14） */
export function withoutKeyFields(input: PresetInput): PresetInput {
  if (!isSubscriptionAuth(input)) {
    return input
  }
  return { ...input, baseUrl: undefined, apiKey: undefined }
}
