import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'

import { switchService } from '@/app/composition'
import { QUERY_KEYS } from '@/constants/query-keys'
import { TARGET_TOOLS, TOOL_META } from '@/constants/tools'
import { TRAY_SWITCH_EVENT, type TraySwitchPayload } from '@/constants/tray'
import type { Preset, TargetTool } from '@/domain/entities/preset'
import { notifyDesktop } from '@/adapters/notify/desktop-notify'
import { usePresets } from '@/hooks/use-presets'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'

export interface TrayPresetItem {
  id: string
  name: string
}

export interface TraySection {
  tool: string
  label: string
  presets: TrayPresetItem[]
}

export interface TraySectionsPayload {
  sections: TraySection[]
}

/** 预设列表 → 托盘菜单分区（与 Rust TraySectionsPayload 契约一致） */
export function toTraySections(presets: readonly Preset[]): TraySectionsPayload {
  return {
    sections: TARGET_TOOLS.map((tool) => ({
      tool,
      label: TOOL_META[tool].label,
      presets: presets
        .filter((preset) => preset.tool === tool)
        .map((preset) => ({ id: preset.id, name: preset.name })),
    })),
  }
}

async function performTraySwitch(
  rawTool: string,
  presetId: string,
  queryClient: QueryClient
): Promise<void> {
  const tool: TargetTool | null = rawTool === 'claude-code' || rawTool === 'codex' ? rawTool : null
  if (!tool) {
    return
  }
  const presets = queryClient.getQueryData<Preset[]>(QUERY_KEYS.presets) ?? []
  const name = presets.find((preset) => preset.id === presetId)?.name ?? '预设'
  try {
    await switchService.switch(tool, presetId)
    toastSuccess(`已切换到 ${name}`)
    await notifyDesktop('JakeAITools', `已切换到 ${name}`)
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.toolStatus })
  } catch (error) {
    const message = errorMessage(error)
    toastError(message)
    await notifyDesktop('JakeAITools', `切换失败：${message}`)
  }
}

/** 托盘集成（US-08）：预设变化同步菜单 + 监听托盘切换事件 */
export function useTrayIntegration(): void {
  const { data: presets } = usePresets()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!presets) {
      return
    }
    void invoke('tray_update', { payload: toTraySections(presets) }).catch(() => {
      // 浏览器开发模式下没有托盘，静默忽略
    })
  }, [presets])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let disposed = false
    void listen<TraySwitchPayload>(TRAY_SWITCH_EVENT, (event) => {
      void performTraySwitch(event.payload.tool, event.payload.presetId, queryClient)
    })
      .then((fn) => {
        if (disposed) {
          fn()
        } else {
          unlisten = fn
        }
      })
      .catch(() => {
        // 浏览器开发模式无事件通道
      })
    return () => {
      disposed = true
      unlisten?.()
    }
  }, [queryClient])
}
