use tauri::AppHandle;
use tauri_plugin_fs::FsExt;

/// 为用户已选定的项目目录授予本会话 fs 递归访问范围（US-21）。
/// 目录选择器与历史记录重授权共用此命令；scope 仅存活于当前进程。
#[tauri::command]
pub fn allow_project_dirs(app: AppHandle, paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() || paths.iter().any(|p| p.trim().is_empty()) {
        return Err("paths 不能为空且元素不能为空字符串".to_string());
    }
    let scope = app.fs_scope();
    for path in &paths {
        scope
            .allow_directory(path, true)
            .map_err(|e| format!("授予目录访问范围失败 ({path}): {e}"))?;
    }
    Ok(())
}
