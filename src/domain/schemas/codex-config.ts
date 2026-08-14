import { z } from 'zod'

/** 单个 model_providers 块的宽松结构 */
const providerBlockSchema = z.looseObject({
  base_url: z.string().optional(),
  name: z.string().optional(),
  /** DeepSeek 官方安装脚本等将 Key 直接内嵌于 provider 块 */
  experimental_bearer_token: z.string().optional(),
})

export type CodexProviderBlock = z.infer<typeof providerBlockSchema>

/** Codex config.toml 解析后的宽松结构（TOML → JS 对象 → 本 Schema 校验） */
export const codexConfigSchema = z.looseObject({
  model: z.string().optional(),
  model_provider: z.string().optional(),
  /** 自定义模型目录指针：整体替换 Codex 内置目录（非叠加） */
  model_catalog_json: z.string().optional(),
  model_providers: z.record(z.string(), providerBlockSchema).optional(),
})

export type CodexConfig = z.infer<typeof codexConfigSchema>
