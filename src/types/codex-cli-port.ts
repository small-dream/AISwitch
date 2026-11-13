/** `codex login status` 的单次执行结果；stderr 也纳入解析（CLI 实际把状态写到 stderr） */
export type CodexCliResult =
  | {
      status: 'ran'
      stdout: string
      stderr: string
      exitCode: number | null
    }
  | { status: 'unavailable'; reason: string }

export interface CodexCliPort {
  loginStatus(): Promise<CodexCliResult>
}
