import { describe, expect, it } from 'vitest'

import type { ToolStatus } from '@/domain/entities/preset'
import { toTraySections } from '@/hooks/use-tray'
import { makePreset } from '../helpers/make-preset'

function makeStatus(overrides: Partial<ToolStatus> = {}): ToolStatus {
  return {
    tool: 'claude-code',
    status: 'installed',
    activeModel: 'glm-4.6',
    activeProviderName: 'https://open.bigmodel.cn/api/anthropic',
    ...overrides,
  }
}

describe('toTraySections', () => {
  it('按工具分组并只保留菜单所需字段', () => {
    const claudeA = makePreset({ id: 'a', name: 'GLM-4.6' })
    const claudeB = makePreset({ id: 'b', name: 'Kimi', apiKey: 'sk-other', model: 'kimi-k2' })
    const codex = makePreset({ id: 'c', name: 'DeepSeek', tool: 'codex' })

    const payload = toTraySections([claudeA, claudeB, codex], [
      makeStatus(),
      makeStatus({ tool: 'codex', activeModel: 'deepseek-chat' }),
    ])

    expect(payload.sections).toEqual([
      {
        tool: 'claude-code',
        label: 'Claude Code',
        presets: [
          { id: 'a', name: 'GLM-4.6', active: true },
          { id: 'b', name: 'Kimi', active: false },
        ],
      },
      {
        tool: 'codex',
        label: 'Codex CLI',
        presets: [{ id: 'c', name: 'DeepSeek', active: false }],
      },
    ])
  })

  it('无预设时各分区为空数组（Rust 侧显示「暂无预设」）', () => {
    const payload = toTraySections([], [])
    expect(payload.sections.map((section) => section.presets)).toEqual([[], []])
  })
})
