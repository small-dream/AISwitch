/// IPC 连通性自检命令（环境搭建期的桥接验证）
#[tauri::command]
pub fn ping() -> &'static str {
    "pong"
}
