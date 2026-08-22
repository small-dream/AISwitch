import { z } from 'zod'

/** 组合预设：聚合各目标工具的预设，一次操作全家桶切换（US-17） */
export const bundleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  /** 各工具引用预设 id；未设置表示该工具不参与切换 */
  claudePresetId: z.string().min(1).optional(),
  codexPresetId: z.string().min(1).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

/** 组合预设库文件 ~/.aiswitch/bundles.json 的结构 */
export const bundleCollectionSchema = z.object({
  version: z.literal(1),
  bundles: z.array(bundleSchema),
})

/** 创建/更新组合时的用户输入：至少选择一个工具的预设 */
export const bundleInputSchema = bundleSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .superRefine((input, ctx) => {
    if (!input.claudePresetId && !input.codexPresetId) {
      ctx.addIssue({
        code: 'custom',
        path: ['claudePresetId'],
        message: '至少选择一个工具的预设',
      })
    }
  })
