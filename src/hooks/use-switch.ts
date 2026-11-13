import { useMutation, useQueryClient } from '@tanstack/react-query'

import { switchService } from '@/app/composition'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { TargetTool } from '@/domain/entities/preset'
import type { ClearManagedOptions } from '@/types/config-target'

/**
 * 切换类写操作的统一失效：探测状态、备份列表、订阅登录态。
 * 成功与失败都要失效——失败可能已经写入部分文件（apply 失败但回滚也失败时磁盘确实是坏的），
 * 界面停在旧状态会把一次失败的切换显示成「仍然是上一个预设」。
 */
function useToolStateInvalidation(): () => void {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.toolStatus })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.backups })
    // 订阅条目切换后登录态提示需重新探测（可能刚在终端完成登录）
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscriptionAuthRoot })
  }
}

export function useSwitchPreset() {
  const invalidate = useToolStateInvalidation()
  return useMutation({
    mutationFn: (args: { tool: TargetTool; presetId: string }) =>
      switchService.switch(args.tool, args.presetId),
    onSuccess: invalidate,
    onError: invalidate,
  })
}

/** 官方订阅条目（PRD §5.13）：清空该工具的全部托管键，交回 CLI 登录态与模型选择 */
export function useClearManaged() {
  const invalidate = useToolStateInvalidation()
  return useMutation({
    mutationFn: (args: { tool: TargetTool; options?: ClearManagedOptions }) =>
      switchService.clearManaged(args.tool, args.options),
    onSuccess: invalidate,
    onError: invalidate,
  })
}

export function useRollback() {
  const invalidate = useToolStateInvalidation()
  return useMutation({
    mutationFn: (tool: TargetTool) => switchService.rollback(tool),
    onSuccess: invalidate,
    onError: invalidate,
  })
}
