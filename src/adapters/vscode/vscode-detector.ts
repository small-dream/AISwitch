import type { TargetTool } from '@/domain/entities/preset'
import type { VscodePresence } from '@/domain/entities/vscode'
import type { FileSystemPort } from '@/types/fs-port'

const EXTENSION_DIRS = ['.vscode/extensions', '.vscode-insiders/extensions'] as const

const EXTENSION_IDS: Record<TargetTool, readonly string[]> = {
  'claude-code': ['anthropic.claude-code'],
  codex: ['openai.chatgpt', 'openai.codex'],
}

/** 检测 VS Code 插件安装迹象（PRD US-14）：仅影响提示文案，不影响功能 */
export async function detectVscodeExtensions(fs: FileSystemPort): Promise<VscodePresence> {
  const result: VscodePresence = { 'claude-code': false, codex: false }
  for (const dir of EXTENSION_DIRS) {
    if (!(await fs.exists(dir))) {
      continue
    }
    for (const name of await fs.readDir(dir)) {
      for (const tool of Object.keys(EXTENSION_IDS) as TargetTool[]) {
        const matched = EXTENSION_IDS[tool].some((id) => name.startsWith(id))
        result[tool] = result[tool] || matched
      }
    }
  }
  return result
}
