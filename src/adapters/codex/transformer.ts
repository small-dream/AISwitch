import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'

import { PATHS } from '@/constants/paths'
import { AppError } from '@/domain/errors'
import type { CodexAuthFile } from '@/domain/rules/codex-merge'
import type { CodexModelCatalogFile } from '@/domain/rules/codex-catalog'
import {
  codexConfigSchema,
  type CodexConfig,
  type CodexProviderBlock,
} from '@/domain/schemas/codex-config'

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

/** 空串 bearer token 不落盘（PRD §5.10：空 Key 删除鉴权键），防御 merge 之外的构造路径 */
function withoutEmptyTokens(config: CodexConfig): CodexConfig {
  const providers = config.model_providers
  if (!providers) {
    return config
  }
  let changed = false
  const next: Record<string, CodexProviderBlock> = {}
  for (const [name, block] of Object.entries(providers)) {
    if (block.experimental_bearer_token === '') {
      const copy = { ...block }
      Reflect.deleteProperty(copy, 'experimental_bearer_token')
      next[name] = copy
      changed = true
    } else {
      next[name] = block
    }
  }
  return changed ? { ...config, model_providers: next } : config
}

export function serializeCodexConfig(config: CodexConfig): string {
  return stringifyToml(withoutEmptyTokens(config))
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

export function parseCodexModels(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    throw new AppError('E_CONFIG_PARSE', 'Codex models.json 不是合法 JSON', { path: PATHS.codexModels })
  }
}

export function serializeCodexModels(models: CodexModelCatalogFile): string {
  return `${JSON.stringify(models, null, 2)}\n`
}
