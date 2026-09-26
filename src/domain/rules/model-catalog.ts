import { isRecord } from '@/utils/guards'

const LIST_KEYS = ['data', 'models', 'result'] as const
const ID_KEYS = ['id', 'slug', 'name'] as const

/** 取出候选条目数组：OpenAI / Anthropic / 自定义网关的包裹字段各不相同 */
function collectEntries(payload: unknown): readonly unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }
  if (!isRecord(payload)) {
    return []
  }
  for (const key of LIST_KEYS) {
    const value = payload[key]
    if (Array.isArray(value)) {
      return value
    }
  }
  return []
}

function toModelId(entry: unknown): string | undefined {
  if (typeof entry === 'string') {
    return entry.trim() || undefined
  }
  if (!isRecord(entry)) {
    return undefined
  }
  for (const key of ID_KEYS) {
    const value = entry[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

/** 容错提取模型 id：结构不符只返回空数组，绝不抛错（拉取失败时降级为手填） */
export function parseModelIds(payload: unknown): string[] {
  const ids: string[] = []
  for (const entry of collectEntries(payload)) {
    const id = toModelId(entry)
    if (id !== undefined && !ids.includes(id)) {
      ids.push(id)
    }
  }
  return ids
}
