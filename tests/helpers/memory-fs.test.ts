import { describe, expect, it } from 'vitest'

import { createMemoryFs } from './memory-fs'

describe('createMemoryFs 目录约束（与 Tauri plugin-fs 一致）', () => {
  it('父目录未创建时 writeTextFile 抛 ENOENT', async () => {
    const fs = createMemoryFs()

    await expect(fs.writeTextFile('.aiswitch/presets.json', '{}')).rejects.toThrow(/ENOENT/)
    expect(fs.files().has('.aiswitch/presets.json')).toBe(false)
  })

  it('mkdir 后可写；mkdir 幂等且递归创建祖先目录', async () => {
    const fs = createMemoryFs()

    await fs.mkdir('.aiswitch/baseline/claude-code')
    await fs.mkdir('.aiswitch/baseline/claude-code')
    await fs.writeTextFile('.aiswitch/baseline/manifest.json', '{}')

    expect(await fs.exists('.aiswitch')).toBe(true)
    expect(fs.files().get('.aiswitch/baseline/manifest.json')).toBe('{}')
  })

  it('种子文件隐式创建父目录（既有 fixture 无需显式 mkdir）', async () => {
    const fs = createMemoryFs({ '.claude/settings.json': '{}' })

    await fs.writeTextFile('.claude/other.json', 'x')

    expect(fs.files().get('.claude/other.json')).toBe('x')
  })

  it('rename 目标父目录未创建时抛 ENOENT', async () => {
    const fs = createMemoryFs({ '.claude/settings.json.jake-tmp': '{}' })

    await expect(
      fs.rename('.claude/settings.json.jake-tmp', '.aiswitch/settings.json')
    ).rejects.toThrow(/ENOENT/)
  })
})
