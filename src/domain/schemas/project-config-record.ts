import { z } from 'zod'

import { targetToolSchema } from './preset'

/** 已写入项目配置的索引记录，不包含密钥等配置内容。 */
export const projectConfigRecordSchema = z.object({
  projectPath: z.string().min(1),
  tool: targetToolSchema,
  updatedAt: z.iso.datetime(),
})

export const projectConfigRecordCollectionSchema = z.object({
  version: z.literal(1),
  records: z.array(projectConfigRecordSchema),
})
