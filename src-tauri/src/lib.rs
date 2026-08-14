mod commands;

/// Rust 薄壳原则（ARCHITECTURE §2.3 D5）：
/// 业务逻辑一律上移 TS 层，这里仅注册插件与特权命令。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![commands::system::ping])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
