mod commands;
mod tray;

/// Rust 薄壳原则（ARCHITECTURE §2.3 D5）：
/// 业务逻辑一律上移 TS 层，这里仅注册插件、托盘装配与特权命令。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 单实例锁必须最先注册：重复启动时唤起已有窗口（PRD §7.4）
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main_window(app);
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::permissions::restrict_to_owner,
            commands::system::ping,
            commands::tray::tray_update
        ])
        .setup(|app| {
            tray::init_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 常驻托盘（US-08）：关闭窗口仅隐藏，退出走托盘菜单
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // macOS：点击 Dock 图标（Reopen）时，若无可见窗口则重新显示主窗口
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { has_visible_windows, .. } = event {
                if !has_visible_windows {
                    tray::show_main_window(app);
                }
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
        });
}
