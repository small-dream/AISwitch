import { describe, expect, it } from 'vitest'

import type { ToolStatus } from '@/domain/entities/preset'
import { isActivePreset } from '@/domain/rules/active-preset'
import { makePreset } from '../../helpers/make-preset'

function makeStatus(overrides: Partial<ToolStatus> = {}): ToolStatus {
  return {
    tool: 'claude-code',
    status: 'installed',
    activeModel: 'glm-4.6',
    activeProviderName: 'https://open.bigmodel.cn/api/anthropic',
    ...overrides,
  }
}

describe('isActivePreset', () => {
  it('探测状态缺失时返回 false', () => {
    expect(isActivePreset(makePreset(), undefined)).toBe(false)
  })

  it('工具未配置时返回 false', () => {
    expect(isActivePreset(makePreset(), makeStatus({ status: 'not-configured' }))).toBe(false)
  })

  it('无生效模型时返回 false', () => {
    expect(isActivePreset(makePreset(), makeStatus({ activeModel: undefined }))).toBe(false)
  })

  it('模型名不匹配时返回 false', () => {
    expect(isActivePreset(makePreset(), makeStatus({ activeModel: 'glm-4.6-air' }))).toBe(false)
  })

  it('自定义供应商预设：baseUrl 与探测值一致时返回 true', () => {
    expect(isActivePreset(makePreset(), makeStatus())).toBe(true)
  })

  it('自定义供应商预设：同模型但 baseUrl 不同返回 false', () => {
    const status = makeStatus({ activeProviderName: 'https://api.other.cn/v1' })
    expect(isActivePreset(makePreset(), status)).toBe(false)
  })

  it('官方 API 预设：探测值为非 URL（官方）时返回 true', () => {
    const preset = makePreset({ baseUrl: undefined })
    const status = makeStatus({ activeProviderName: '官方 API' })
    expect(isActivePreset(preset, status)).toBe(true)
  })

  it('官方 API 预设：探测值为 URL（自定义供应商）时返回 false', () => {
    const preset = makePreset({ baseUrl: undefined })
    expect(isActivePreset(preset, makeStatus())).toBe(false)
  })

  it('codex 官方供应商探测值（provider id）视为非自定义', () => {
    const preset = makePreset({ tool: 'codex', baseUrl: undefined })
    const status = makeStatus({ tool: 'codex', activeProviderName: 'openai' })
    expect(isActivePreset(preset, status)).toBe(true)
  })
})
