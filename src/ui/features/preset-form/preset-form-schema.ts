import { z } from 'zod'

import { presetInputSchema } from '@/domain/schemas/preset'

/** 表单态 URL：留空表示官方 API，填写时必须是合法 URL */
const urlField = z
  .string()
  .trim()
  .refine((value) => value === '' || URL.canParse(value), '请输入合法 URL 或留空')

/** 表单 Schema：在领域输入 Schema 基础上放宽空串（提交前归一化） */
export const presetFormSchema = presetInputSchema.extend({
  name: z.string().trim().min(1, '请填写预设名称').max(50),
  providerName: z.string().trim().min(1, '请填写供应商名称').max(50),
  apiKey: z.string().trim().min(1, '请填写 API Key'),
  model: z.string().trim().min(1, '请填写模型名').max(100),
  baseUrl: urlField,
  smallFastModel: z.string().trim().max(100, '最多 100 字符').optional(),
})

export type PresetFormValues = z.infer<typeof presetFormSchema>
