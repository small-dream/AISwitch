const SAFE_SHELL_ARG = /^[A-Za-z0-9_./:@%+=,-]+$/

/** 单引号包裹需要转义的路径；安全字符保持原样，避免命令难以阅读 */
export function quoteShellArg(value: string): string {
  if (SAFE_SHELL_ARG.test(value)) {
    return value
  }
  return `'${value.replaceAll("'", "'\\''")}'`
}

function codexCommand(executable: string | undefined, args: string): string {
  return executable ? `${quoteShellArg(executable)} ${args}` : `codex ${args}`
}

/**
 * Codex 登录命令（PRD §5.13）：只安装 ChatGPT 桌面端时 `codex` 不在用户终端的
 * PATH 中，因此优先使用探测到的 CLI 绝对路径，保证复制出来的命令可直接执行。
 */
export function buildCodexLoginCommand(executable?: string): string {
  return codexCommand(executable, 'login')
}

/** 账号查询命令，与登录命令使用同一个可执行文件 */
export function buildCodexLoginStatusCommand(executable?: string): string {
  return codexCommand(executable, 'login status')
}
