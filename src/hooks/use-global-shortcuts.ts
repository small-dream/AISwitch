import { getCurrentWindow } from '@tauri-apps/api/window'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { switchService } from '@/app/composition'
import { QUERY_KEYS } from '@/constants/query-keys'
import { SHORTCUTS } from '@/constants/shortcut'
import type { Preset, ToolStatus } from '@/domain/entities/preset'
import { nextPresetId } from '@/domain/rules/next-preset'
import { t } from '@/i18n/index'
import { useUIStore } from '@/stores/ui-store'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'

async function showMainWindow(): Promise<void> {
  const window = getCurrentWindow()
  await window.show()
  await window.setFocus()
}

async function handleNextPreset(queryClient: QueryClient): Promise<void> {
  const tool = useUIStore.getState().activeTool
  const presets = queryClient.getQueryData<Preset[]>(QUERY_KEYS.presets) ?? []
  const statuses = queryClient.getQueryData<ToolStatus[]>(QUERY_KEYS.toolStatus) ?? []
  const status = statuses.find((item) => item.tool === tool)
  const nextId = nextPresetId(presets, tool, status)
  if (!nextId) {
    toastError(t('shortcut.noPresetToSwitch'))
    return
  }
  const preset = presets.find((item) => item.id === nextId)
  try {
    await switchService.switch(tool, nextId)
    toastSuccess(t('shortcut.switchedTo', { name: preset?.name ?? '' }))
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.toolStatus })
  } catch (error) {
    toastError(errorMessage(error))
  }
}

/** 全局快捷键（US-20）：呼出主窗口 + 循环切换下一预设；浏览器开发模式下注册失败静默忽略 */
export function useGlobalShortcuts(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    void register(SHORTCUTS.showWindow, () => {
      void showMainWindow().catch(() => undefined)
    }).catch(() => undefined)
    void register(SHORTCUTS.nextPreset, () => {
      void handleNextPreset(queryClient)
    }).catch(() => undefined)

    return () => {
      void unregister(SHORTCUTS.showWindow).catch(() => undefined)
      void unregister(SHORTCUTS.nextPreset).catch(() => undefined)
    }
  }, [queryClient])
}
