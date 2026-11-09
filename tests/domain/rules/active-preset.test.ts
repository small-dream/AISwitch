import { describe, expect, it } from 'vitest'

import type { ToolStatus } from '@/domain/entities/preset'
import { isActivePreset } from '@/domain/rules/active-preset'
import { makePreset } from '../../helpers/make-preset'

function makeStatus(overrides: Partial<ToolStatus> = {}): ToolStatus {
  return {
    tool: 'claude-code',
    status: 'installed',
    activeModel: 'glm-4.6',
    activeProviderName: '智谱 GLM',
    activeProviderUrl: 'https://open.bigmodel.cn/api/anthropic',
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
    const status = makeStatus({ activeProviderUrl: 'https://api.other.cn/v1' })
    expect(isActivePreset(makePreset(), status)).toBe(false)
  })

  it('官方 API 预设：没有自定义供应商 URL 时返回 true', () => {
    const preset = makePreset({ baseUrl: undefined })
    const status = makeStatus({ activeProviderName: '官方 API', activeProviderUrl: undefined })
    expect(isActivePreset(preset, status)).toBe(true)
  })

  it('官方 API 预设：探测到自定义供应商 URL 时返回 false', () => {
    const preset = makePreset({ baseUrl: undefined })
    expect(isActivePreset(preset, makeStatus())).toBe(false)
  })

  it('codex 官方供应商（无自定义 URL）视为非自定义', () => {
    const preset = makePreset({ tool: 'codex', baseUrl: undefined })
    const status = makeStatus({
      tool: 'codex',
      activeProviderName: 'openai',
      activeProviderUrl: undefined,
    })
    expect(isActivePreset(preset, status)).toBe(true)
  })
})

describe('isActivePreset · 展示名与生效判定解耦', () => {
  it('展示名不是 URL（用户自建 provider 块）也能按 base URL 正确匹配', () => {
    const preset = makePreset({
      tool: 'codex',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
    })
    const status = makeStatus({
      tool: 'codex',
      activeModel: 'deepseek-v4-pro',
      activeProviderName: 'DeepSeek',
      activeProviderUrl: 'https://api.deepseek.com/v1',
    })

    expect(isActivePreset(preset, status)).toBe(true)
  })
})
