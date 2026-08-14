import type { Preset, PresetInput } from '@/domain/entities/preset'

/** 生成合法预设（claude-code / 第三方供应商），按需覆盖字段 */
export function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'preset-1',
    name: 'GLM-4.6',
    tool: 'claude-code',
    providerName: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    apiKey: 'sk-test-key',
    model: 'glm-4.6',
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    ...overrides,
  }
}

export function makePresetInput(overrides: Partial<PresetInput> = {}): PresetInput {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = makePreset(overrides)
  return input
}
