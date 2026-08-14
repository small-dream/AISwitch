import { z } from 'zod'

import { presetInputSchema } from '@/domain/schemas/preset'
import { parseModelMetadataField } from './model-metadata'

/** 表单态 URL：留空表示官方 API，填写时必须是合法 URL */
const urlField = z
  .string()
  .trim()
  .refine((value) => value === '' || URL.canParse(value), '请输入合法 URL 或留空')

/** 表单 Schema：在领域输入 Schema 基础上放宽空串（提交前归一化） */
const presetFormBase = presetInputSchema.extend({
  name: z.string().trim().min(1, '请填写预设名称').max(50),
  providerName: z.string().trim().min(1, '请填写供应商名称').max(50),
  apiKey: z.string().trim().min(1, '请填写 API Key'),
  model: z.string().trim().min(1, '请填写模型名').max(100),
  baseUrl: urlField,
  smallFastModel: z.string().trim().max(100, '最多 100 字符').optional(),
  /** 表单态模型元数据：JSON 文本，空串 = 不使用（提交前归一化为 modelMetadata） */
  modelMetadataJson: z.string().optional(),
})

/** 跨字段校验：Codex 的元数据文本须为合法 JSON 对象，且 slug（如有）与模型名一致 */
export const presetFormSchema = presetFormBase.superRefine((values, ctx) => {
  if (values.tool !== 'codex' || !values.modelMetadataJson?.trim()) {
    return
  }
  const { error } = parseModelMetadataField(values.modelMetadataJson, values.model)
  if (error) {
    ctx.addIssue({ code: 'custom', path: ['modelMetadataJson'], message: error })
  }
})

export type PresetFormValues = z.infer<typeof presetFormSchema>
