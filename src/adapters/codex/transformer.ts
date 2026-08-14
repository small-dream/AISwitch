import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'

import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { CodexAuthFile } from '@/domain/rules/codex-merge'
import { codexConfigSchema, type CodexConfig } from '@/domain/schemas/codex-config'

export function parseCodexConfig(raw: string): CodexConfig {
  let value: unknown
  try {
    value = parseToml(raw)
  } catch {
    throw new AppError('E_CONFIG_PARSE', 'Codex 配置不是合法 TOML', { path: PATHS.codexConfig })
  }
  const result = codexConfigSchema.safeParse(value)
  if (!result.success) {
    throw new AppError('E_CONFIG_PARSE', 'Codex 配置结构不符合预期', { path: PATHS.codexConfig })
  }
  return result.data
}

export function serializeCodexConfig(config: CodexConfig): string {
  return stringifyToml(config)
}

export function parseCodexAuth(raw: string): unknown {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new AppError('E_CONFIG_PARSE', 'Codex auth.json 不是合法 JSON', { path: PATHS.codexAuth })
  }
  return value
}

export function serializeCodexAuth(auth: CodexAuthFile): string {
  return `${JSON.stringify(auth, null, 2)}\n`
}
