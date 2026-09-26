import type { ModelCatalogFetcher } from '@/adapters/connectivity/model-catalog-fetcher'
import type { ModelCatalogQuery, ModelCatalogResult } from '@/domain/entities/model-catalog'

/** 模型目录查询（US-19）：为预设表单的模型名下拉提供候选，失败仅降级为手填 */
export class ModelCatalogService {
  constructor(private readonly fetcher: ModelCatalogFetcher) {}

  list(query: ModelCatalogQuery): Promise<ModelCatalogResult> {
    return this.fetcher.list(query)
  }
}
