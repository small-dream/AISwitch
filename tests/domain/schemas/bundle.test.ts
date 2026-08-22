import { describe, expect, it } from 'vitest'

import { bundleInputSchema } from '@/domain/schemas/bundle'

function input(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { name: '全家 GLM', claudePresetId: 'p1', ...overrides }
}

describe('bundleInputSchema', () => {
  it('两个工具都选择：通过', () => {
    expect(bundleInputSchema.safeParse(input({ codexPresetId: 'p2' })).success).toBe(true)
  })

  it('仅选择一个工具：通过', () => {
    expect(bundleInputSchema.safeParse(input()).success).toBe(true)
    expect(
      bundleInputSchema.safeParse(input({ claudePresetId: undefined, codexPresetId: 'p2' })).success
    ).toBe(true)
  })

  it('两个工具都不选：拒绝', () => {
    expect(
      bundleInputSchema.safeParse(input({ claudePresetId: undefined, codexPresetId: undefined }))
        .success
    ).toBe(false)
  })

  it('名称为空：拒绝', () => {
    expect(bundleInputSchema.safeParse(input({ name: '' })).success).toBe(false)
  })
})
