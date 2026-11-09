import { getCurrentWindow } from '@tauri-apps/api/window'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { tauriGlobalShortcuts } from '@/adapters/system/global-shortcuts'
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
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.backups })
  } catch (error) {
    toastError(errorMessage(error))
  }
}

/** 注册失败不再静默：US-20 全靠这两条快捷键，静默会让「按了没反应」无从排查 */
async function registerShortcuts(queryClient: QueryClient): Promise<void> {
  try {
    await tauriGlobalShortcuts.register(SHORTCUTS.showWindow, () => {
      void showMainWindow().catch(() => undefined)
    })
    await tauriGlobalShortcuts.register(SHORTCUTS.nextPreset, () => {
      void handleNextPreset(queryClient)
    })
  } catch (error) {
    toastError(t('shortcut.registerFailed', { detail: errorMessage(error) }))
  }
}

/** 全局快捷键（US-20）：呼出主窗口 + 循环切换下一预设；端口内部已处理浏览器预览与顺序问题 */
export function useGlobalShortcuts(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    void registerShortcuts(queryClient)
    return () => {
      void tauriGlobalShortcuts.unregister(SHORTCUTS.showWindow).catch(() => undefined)
      void tauriGlobalShortcuts.unregister(SHORTCUTS.nextPreset).catch(() => undefined)
    }
  }, [queryClient])
}
