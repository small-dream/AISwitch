import { describe, expect, it } from 'vitest'

import type { Preset, ToolStatus } from '@/domain/entities/preset'
import { nextPresetId } from '@/domain/rules/next-preset'
import { makePreset } from '../../helpers/make-preset'

function activeStatus(model: string): ToolStatus {
  return {
    tool: 'claude-code',
    status: 'installed',
    activeModel: model,
    activeProviderName: 'https://open.bigmodel.cn/api/anthropic',
  }
}

function claudePresets(): Preset[] {
  return [
    makePreset({ id: 'a', model: 'glm-4.6' }),
    makePreset({ id: 'b', model: 'glm-4.7' }),
    makePreset({ id: 'c', model: 'glm-4.8' }),
  ]
}

describe('nextPresetId', () => {
  it('空列表返回 undefined', () => {
    expect(nextPresetId([], 'claude-code', activeStatus('glm-4.6'))).toBeUndefined()
  })

  it('仅一个预设无「下一个」可切，返回 undefined', () => {
    const presets = [makePreset({ id: 'a', model: 'glm-4.6' })]
    expect(nextPresetId(presets, 'claude-code', activeStatus('glm-4.6'))).toBeUndefined()
  })

  it('当前生效为第一项时返回第二项', () => {
    expect(nextPresetId(claudePresets(), 'claude-code', activeStatus('glm-4.6'))).toBe('b')
  })

  it('当前生效为最后一项时循环回第一项', () => {
    expect(nextPresetId(claudePresets(), 'claude-code', activeStatus('glm-4.8'))).toBe('a')
  })

  it('当前生效不在列表中（如刚导入未切换）时取第一项', () => {
    expect(nextPresetId(claudePresets(), 'claude-code', undefined)).toBe('a')
  })

  it('只统计当前工具，忽略其他工具预设', () => {
    const presets = [...claudePresets(), makePreset({ id: 'x', tool: 'codex', model: 'gpt-5' })]
    expect(nextPresetId(presets, 'claude-code', activeStatus('glm-4.8'))).toBe('a')
  })
})
