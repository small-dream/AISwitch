import { useMutation } from '@tanstack/react-query'

import { connectivityService } from '@/app/composition'
import type { Preset } from '@/domain/entities/preset'

/** 连通性测试（US-06）：组件局部实例，结果内联展示 */
export function useConnectivityTest() {
  return useMutation({
    mutationFn: (preset: Preset) => connectivityService.test(preset),
  })
}
