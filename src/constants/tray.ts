/** 托盘 ↔ 前端事件契约（与 src-tauri/src/tray.rs 保持一致） */
export const TRAY_SWITCH_EVENT = 'tray://switch'

export interface TraySwitchPayload {
  tool: string
  presetId: string
}
