import { z } from 'zod'

/** 单个 model_providers 块的宽松结构 */
const providerBlockSchema = z.looseObject({
  base_url: z.string().optional(),
})

/** Codex config.toml 解析后的宽松结构（TOML → JS 对象 → 本 Schema 校验） */
export const codexConfigSchema = z.looseObject({
  model: z.string().optional(),
  model_provider: z.string().optional(),
  model_providers: z.record(z.string(), providerBlockSchema).optional(),
})

export type CodexConfig = z.infer<typeof codexConfigSchema>
