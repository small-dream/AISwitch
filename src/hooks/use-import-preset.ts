import { useMutation } from '@tanstack/react-query'

import { importService } from '@/app/composition'
import type { TargetTool } from '@/domain/entities/preset'

/** 从本机现有配置导入预设草稿（US-07） */
export function useImportPreset() {
  return useMutation({
    mutationFn: (tool: TargetTool) => importService.importFrom(tool),
  })
}
