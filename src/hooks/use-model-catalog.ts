import { useState } from 'react'

import { modelCatalogService } from '@/app/composition'
import type { ModelCatalogQuery, ModelCatalogResult } from '@/domain/entities/model-catalog'

/**
 * 拉取供应商模型目录填充模型名下拉（US-19）：表单局部状态。
 * 刻意不用 react-query：结果只服务于当前弹窗、无需缓存，也避免表单依赖 QueryClient。
 */
export function useModelCatalog() {
  const [pending, setPending] = useState(false)

  const list = async (query: ModelCatalogQuery): Promise<ModelCatalogResult> => {
    setPending(true)
    try {
      return await modelCatalogService.list(query)
    } finally {
      setPending(false)
    }
  }

  return { list, pending }
}
