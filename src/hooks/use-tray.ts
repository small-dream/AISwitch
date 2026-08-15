import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'

import { switchService } from '@/app/composition'
import { QUERY_KEYS } from '@/constants/query-keys'
import { TARGET_TOOLS, TOOL_META } from '@/constants/tools'
import { TRAY_SWITCH_EVENT, type TraySwitchPayload } from '@/constants/tray'
import { isActivePreset } from '@/domain/rules/active-preset'
import type { Preset, TargetTool, ToolStatus } from '@/domain/entities/preset'
import { notifyDesktop } from '@/adapters/notify/desktop-notify'
import { t, useT } from '@/i18n/index'
import { usePresets } from '@/hooks/use-presets'
import { useToolStatus } from '@/hooks/use-tool-status'
import { toastError, toastSuccess } from '@/stores/toast-store'
import { errorMessage } from '@/utils/error-message'

export interface TrayPresetItem {
  id: string
  name: string
  active: boolean
}

export interface TraySection {
  tool: string
  label: string
  presets: TrayPresetItem[]
}

/** 托盘静态菜单文案（Rust 侧 serde 默认值兜底为中文） */
export interface TrayStrings {
  showMain: string
  quit: string
  noPresets: string
  tooltip: string
}

export interface TraySectionsPayload {
  sections: TraySection[]
  strings: TrayStrings
}

/** 预设列表 → 托盘菜单分区（与 Rust TraySectionsPayload 契约一致），active 标记当前生效预设 */
export function toTraySections(
  presets: readonly Preset[],
  statuses: readonly ToolStatus[],
  strings: TrayStrings
): TraySectionsPayload {
  return {
    sections: TARGET_TOOLS.map((tool) => {
      const status = statuses.find((item) => item.tool === tool)
      return {
        tool,
        label: TOOL_META[tool].label,
        presets: presets
          .filter((preset) => preset.tool === tool)
          .map((preset) => ({
            id: preset.id,
            name: preset.name,
            active: isActivePreset(preset, status),
          })),
      }
    }),
    strings,
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
  const name = presets.find((preset) => preset.id === presetId)?.name ?? t('tray.presetFallback')
  try {
    await switchService.switch(tool, presetId)
    toastSuccess(t('tray.switchedTo', { name }))
    await notifyDesktop('AISwitch', t('tray.switchedTo', { name }))
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.toolStatus })
  } catch (error) {
    const message = errorMessage(error)
    toastError(message)
    await notifyDesktop('AISwitch', t('tray.switchFailed', { message }))
  }
}

/** 托盘集成（US-08）：预设变化同步菜单 + 监听托盘切换事件 */
export function useTrayIntegration(): void {
  const { data: presets } = usePresets()
  const { data: statuses } = useToolStatus()
  const queryClient = useQueryClient()
  const t = useT()

  useEffect(() => {
    if (!presets) {
      return
    }
    const strings: TrayStrings = {
      showMain: t('tray.showMain'),
      quit: t('tray.quit'),
      noPresets: t('tray.noPresets'),
      tooltip: t('tray.tooltip'),
    }
    void invoke('tray_update', { payload: toTraySections(presets, statuses ?? [], strings) }).catch(
      () => {
        // 浏览器开发模式下没有托盘，静默忽略
      }
    )
  }, [presets, statuses, t])

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
