import { describe, expect, it } from 'vitest'

import { toTraySections } from '@/hooks/use-tray'
import { makePreset } from '../helpers/make-preset'

describe('toTraySections', () => {
  it('按工具分组并只保留菜单所需字段', () => {
    const claudeA = makePreset({ id: 'a', name: 'GLM-4.6' })
    const claudeB = makePreset({ id: 'b', name: 'Kimi', apiKey: 'sk-other' })
    const codex = makePreset({ id: 'c', name: 'DeepSeek', tool: 'codex' })

    const payload = toTraySections([claudeA, claudeB, codex])

    expect(payload.sections).toEqual([
      {
        tool: 'claude-code',
        label: 'Claude Code',
        presets: [
          { id: 'a', name: 'GLM-4.6' },
          { id: 'b', name: 'Kimi' },
        ],
      },
      { tool: 'codex', label: 'Codex CLI', presets: [{ id: 'c', name: 'DeepSeek' }] },
    ])
  })

  it('无预设时各分区为空数组（Rust 侧显示「暂无预设」）', () => {
    const payload = toTraySections([])
    expect(payload.sections.map((section) => section.presets)).toEqual([[], []])
  })
})
