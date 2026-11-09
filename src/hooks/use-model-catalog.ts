import { useState } from 'react'

import { modelCatalogService } from '@/app/composition'
import type { ModelCatalogQuery, ModelCatalogResult } from '@/domain/entities/model-catalog'

/**
 * 拉取供应商模型目录填充模型名下拉（US-19）：表单局部状态。
 * 刻意不用 react-query：结果只服务于当前弹窗、无需缓存，也避免表单依赖 QueryClient。
 * `pending` 用计数而非布尔：两次请求重叠时，先返回的那次不能把「仍在拉取」提前复位。
 */
export function useModelCatalog() {
  const [pendingCount, setPendingCount] = useState(0)

  const list = async (query: ModelCatalogQuery): Promise<ModelCatalogResult> => {
    setPendingCount((count) => count + 1)
    try {
      return await modelCatalogService.list(query)
    } finally {
      setPendingCount((count) => count - 1)
    }
  }

  return { list, pending: pendingCount > 0 }
}
