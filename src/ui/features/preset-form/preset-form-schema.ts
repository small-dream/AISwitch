import { z } from 'zod'

import { isAllowedBaseUrl } from '@/domain/rules/base-url'
import { presetInputSchema } from '@/domain/schemas/preset'
import type { TFn } from '@/i18n/index'
import { parseModelMetadataField } from './model-metadata'

/** 表单态 URL：留空表示官方 API；https 任意主机，http 仅允许本机回环（防密钥明文外发） */
function urlField(t: TFn) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || URL.canParse(value), t('validation.urlInvalid'))
    .refine((value) => isAllowedBaseUrl(value || undefined), t('validation.urlScheme'))
}

/** 表单 Schema：在领域输入 Schema 基础上放宽空串（提交前归一化）；校验消息按当前语言生成 */
export function buildPresetFormSchema(t: TFn) {
  const presetFormBase = presetInputSchema.extend({
    name: z.string().trim().min(1, t('validation.nameRequired')).max(50),
    providerName: z.string().trim().min(1, t('validation.providerRequired')).max(50),
    /** 本地模型（Ollama / LM Studio 等）无需 Key，允许留空 */
    apiKey: z.string().trim().optional(),
    model: z.string().trim().min(1, t('validation.modelRequired')).max(100),
    baseUrl: urlField(t),
    smallFastModel: z.string().trim().max(100, t('validation.maxLength')).optional(),
    /** 表单态模型元数据：JSON 文本，空串 = 不使用（提交前归一化为 modelMetadata） */
    modelMetadataJson: z.string().optional(),
  })

  /** 跨字段校验：Codex 的元数据文本须为合法 JSON 对象，且 slug（如有）与模型名一致 */
  return presetFormBase.superRefine((values, ctx) => {
    if (values.tool !== 'codex' || !values.modelMetadataJson?.trim()) {
      return
    }
    const { errorKey, errorParams } = parseModelMetadataField(
      values.modelMetadataJson,
      values.model
    )
    if (errorKey) {
      ctx.addIssue({
        code: 'custom',
        path: ['modelMetadataJson'],
        message: t(errorKey, errorParams),
      })
    }
  })
}

export type PresetFormValues = z.infer<ReturnType<typeof buildPresetFormSchema>>
