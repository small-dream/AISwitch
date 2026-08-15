import { describe, expect, it } from 'vitest'

import { translate } from '@/i18n/index'
import type { TFn } from '@/i18n/index'
import { buildPresetFormSchema } from '@/ui/features/preset-form/preset-form-schema'
import { makePresetInput } from '../helpers/make-preset'

const tZh: TFn = (key, params) => translate('zh-CN', key, params)
const presetFormSchema = buildPresetFormSchema(tZh)

/** 表单态输入：presetInputSchema 字段 + 表单扩展字段 */
function formValues(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...makePresetInput(), ...overrides }
}

describe('presetFormSchema baseUrl 策略', () => {
  it('http 非回环 baseUrl 被拒绝', () => {
    const result = presetFormSchema.safeParse(formValues({ baseUrl: 'http://example.com' }))
    expect(result.success).toBe(false)
  })

  it('http 回环与 https baseUrl 通过', () => {
    expect(
      presetFormSchema.safeParse(formValues({ baseUrl: 'http://localhost:11434' })).success
    ).toBe(true)
    expect(
      presetFormSchema.safeParse(formValues({ baseUrl: 'https://relay.example.com' })).success
    ).toBe(true)
  })
})
