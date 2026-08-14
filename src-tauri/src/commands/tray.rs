use tauri::AppHandle;

use crate::tray::{self, TraySectionsPayload};

/// 前端推送预设分区，重建托盘菜单（数据源始终在 TS 侧，ARCHITECTURE D6）
#[tauri::command]
pub fn tray_update(app: AppHandle, payload: TraySectionsPayload) -> Result<(), String> {
    tray::apply_update(&app, &payload).map_err(|error| error.to_string())
}
