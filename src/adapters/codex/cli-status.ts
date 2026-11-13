import { invoke } from '@tauri-apps/api/core'

import type { CodexCliPort, CodexCliResult } from '@/types/codex-cli-port'

interface CodexCliCommandOutput {
  stdout: string
  stderr: string
  exitCode: number | null
}

function failureReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 经窄 Rust 命令执行固定参数 `codex login status`，不向前端开放任意命令 */
export const tauriCodexCli: CodexCliPort = {
  async loginStatus(): Promise<CodexCliResult> {
    try {
      const output = await invoke<CodexCliCommandOutput>('codex_login_status')
      return { status: 'ran', ...output }
    } catch (error) {
      return { status: 'unavailable', reason: failureReason(error) }
    }
  },
}
