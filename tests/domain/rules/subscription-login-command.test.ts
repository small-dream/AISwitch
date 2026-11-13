import { describe, expect, it } from 'vitest'

import {
  buildCodexLoginCommand,
  buildCodexLoginStatusCommand,
  quoteShellArg,
} from '@/domain/rules/subscription-login-command'

describe('quoteShellArg', () => {
  it('普通路径原样返回', () => {
    expect(quoteShellArg('/usr/local/bin/codex')).toBe('/usr/local/bin/codex')
  })

  it('含空格或单引号的路径用单引号包裹并转义', () => {
    expect(quoteShellArg('/Applications/My Apps/codex')).toBe("'/Applications/My Apps/codex'")
    expect(quoteShellArg("/tmp/it's/codex")).toBe("'/tmp/it'\\''s/codex'")
  })
})

describe('Codex 登录命令', () => {
  it('探测到 CLI 路径时生成可直接执行的绝对路径命令', () => {
    expect(
      buildCodexLoginCommand('/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex')
    ).toBe('/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex login')
  })

  it('没有探测结果时回退到 PATH 中的 codex', () => {
    expect(buildCodexLoginCommand()).toBe('codex login')
    expect(buildCodexLoginStatusCommand()).toBe('codex login status')
  })
})
