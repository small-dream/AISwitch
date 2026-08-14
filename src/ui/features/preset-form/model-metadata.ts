import { resolveCatalogEntry } from '@/domain/rules/codex-catalog'
import { isRecord } from '@/utils/guards'

export interface ModelMetadataParse {
  /** 合法的目录条目;空串输入时无值 */
  entry?: Record<string, unknown>
  error?: string
}

/**
 * 表单文本 → 预设元数据:
 * 空串 = 不使用;支持粘贴单条条目或整份 models.json 文件(原样保存,同族模型切换时都进选单);
 * 整份文件须含与模型名匹配的条目;单条的 slug(如有)须与模型名一致。
 */
export function parseModelMetadataField(raw: string, model: string): ModelMetadataParse {
  const text = raw.trim()
  if (!text) {
    return {}
  }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { error: '不是合法 JSON' }
  }
  if (!isRecord(value)) {
    return { error: '须为 JSON 对象(单条条目或整份 models.json 文件)' }
  }
  const isFile = Array.isArray(value.models)
  if (isFile && !resolveCatalogEntry(value, model)) {
    return { error: `按整份文件解析,但未找到与模型名「${model}」匹配的条目` }
  }
  if (!isFile && typeof value.slug === 'string' && value.slug !== model) {
    return { error: `条目 slug「${value.slug}」须与模型名「${model}」一致(或删除 slug 字段,保存时自动补齐)` }
  }
  return { entry: value }
}

/** 预设/草稿携带的元数据 → 表单文本(美化 JSON,便于编辑);无则空串 */
export function metadataToFieldText(metadata: Record<string, unknown> | undefined): string {
  return metadata ? JSON.stringify(metadata, null, 2) : ''
}
