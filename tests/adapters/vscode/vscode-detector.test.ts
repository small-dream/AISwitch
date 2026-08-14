import { describe, expect, it } from 'vitest'

import { detectVscodeExtensions } from '@/adapters/vscode/vscode-detector'
import { createMemoryFs } from '../../helpers/memory-fs'

describe('detectVscodeExtensions', () => {
  it('识别稳定版与 Insiders 中的插件目录', async () => {
    const fs = createMemoryFs({
      '.vscode/extensions/anthropic.claude-code-1.0.7/package.json': '{}',
      '.vscode-insiders/extensions/openai.chatgpt-0.8.0/extension.js': '',
      '.vscode/extensions/ms-vscode.vscode-typescript-5.0.0/package.json': '{}',
    })
    expect(await detectVscodeExtensions(fs)).toEqual({ 'claude-code': true, codex: true })
  })

  it('无关插件不算数，未安装返回双 false', async () => {
    const fs = createMemoryFs({
      '.vscode/extensions/ms-vscode.vscode-typescript-5.0.0/package.json': '{}',
    })
    expect(await detectVscodeExtensions(fs)).toEqual({ 'claude-code': false, codex: false })

    expect(await detectVscodeExtensions(createMemoryFs())).toEqual({
      'claude-code': false,
      codex: false,
    })
  })
})
