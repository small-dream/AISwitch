import { describe, expect, it } from 'vitest'

import { translate } from '@/i18n/index'
import type { TFn } from '@/i18n/index'
import {
  metadataToFieldText,
  parseModelMetadataField,
} from '@/ui/features/preset-form/model-metadata'
import { buildPresetFormSchema } from '@/ui/features/preset-form/preset-form-schema'

const tZh: TFn = (key, params) => translate('zh-CN', key, params)
const presetFormSchema = buildPresetFormSchema(tZh)

/** 断言解析失败并返回中文消息（避免非空断言） */
function expectError(parse: ReturnType<typeof parseModelMetadataField>): string {
  expect(parse.errorKey).toBeTruthy()
  return tZh(parse.errorKey ?? 'metadata.notJson', parse.errorParams)
}

describe('parseModelMetadataField', () => {
  it('空串 / 纯空白 → 不使用，无错误', () => {
    expect(parseModelMetadataField('', 'glm-4.6')).toEqual({})
    expect(parseModelMetadataField('   \n ', 'glm-4.6')).toEqual({})
  })

  it('非法 JSON / 非对象 → 明确报错', () => {
    expect(parseModelMetadataField('{oops', 'm').errorKey).toBe('metadata.notJson')
    expect(parseModelMetadataField('[1, 2]', 'm').errorKey).toBe('metadata.notObject')
    expect(parseModelMetadataField('42', 'm').errorKey).toBe('metadata.notObject')
  })

  it('合法对象原样通过；slug 一致时通过', () => {
    expect(parseModelMetadataField('{"context_window":1}', 'm').entry).toEqual({
      context_window: 1,
    })
    expect(
      parseModelMetadataField('{"slug":"glm-4.6","context_window":1}', 'glm-4.6').entry
    ).toEqual({ slug: 'glm-4.6', context_window: 1 })
  })

  it('slug 与模型名不一致 → 报错并携带两端值（经插值呈现）', () => {
    const message = expectError(parseModelMetadataField('{"slug":"other"}', 'glm-4.6'))
    expect(message).toContain('other')
    expect(message).toContain('glm-4.6')
  })

  it('粘贴整份 models.json → 原样保存（需含当前模型条目）；无匹配条目 → 报错', () => {
    const file = {
      models: [
        { slug: 'other-model', context_window: 1 },
        { slug: 'glm-4.6', context_window: 200000, display_name: 'GLM-4.6' },
      ],
    }
    const text = JSON.stringify(file)
    expect(parseModelMetadataField(text, 'glm-4.6').entry).toEqual(file)
    expect(expectError(parseModelMetadataField(text, 'gpt-5.5'))).toContain('gpt-5.5')
  })
})

describe('metadataToFieldText', () => {
  it('undefined → 空串；对象 → 2 空格缩进 JSON', () => {
    expect(metadataToFieldText(undefined)).toBe('')
    expect(metadataToFieldText({ slug: 'm', n: 1 })).toBe('{\n  "slug": "m",\n  "n": 1\n}')
  })
})

describe('presetFormSchema · modelMetadataJson 跨字段校验', () => {
  const BASE = {
    tool: 'codex',
    name: 'X',
    providerName: 'Y',
    apiKey: 'sk',
    model: 'glm-4.6',
    baseUrl: '',
    smallFastModel: '',
    modelMetadataJson: '',
  }

  it('Codex：合法条目通过，slug 不一致挂在 modelMetadataJson 错误上', () => {
    expect(
      presetFormSchema.safeParse({ ...BASE, modelMetadataJson: '{"context_window":1}' }).success
    ).toBe(true)
    const bad = presetFormSchema.safeParse({ ...BASE, modelMetadataJson: '{"slug":"other"}' })
    expect(bad.success).toBe(false)
    if (!bad.success) {
      expect(bad.error.issues[0]?.path).toEqual(['modelMetadataJson'])
    }
  })

  it('非 Codex 工具不校验元数据文本', () => {
    const result = presetFormSchema.safeParse({
      ...BASE,
      tool: 'claude-code',
      modelMetadataJson: 'not json',
    })
    expect(result.success).toBe(true)
  })
})
