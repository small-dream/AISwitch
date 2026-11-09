use std::path::PathBuf;

use tauri::{AppHandle, Manager};
use tauri_plugin_fs::FsExt;

/// 校验并规范化一个候选项目目录：必须是绝对路径、真实存在且是目录。
fn canonical_dir(raw: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(raw);
    if !path.is_absolute() {
        return Err(format!("项目目录必须是绝对路径: {raw}"));
    }
    let canonical = std::fs::canonicalize(&path)
        .map_err(|error| format!("项目目录不存在或不可访问 ({raw}): {error}"))?;
    if !canonical.is_dir() {
        return Err(format!("项目目录不是目录: {raw}"));
    }
    Ok(canonical)
}

/// 为用户已选定的项目目录授予本会话 fs 递归访问范围（US-21）。
/// 目录选择器与历史记录重授权共用此命令；scope 仅存活于当前进程。
///
/// 授权本身就是能力边界：只放行「主目录之下的真实目录」。相对路径、符号链接逃逸
/// 与任意字符串一律拒绝——否则一次错误调用，或一条被外部篡改的
/// `project-configs.json` 记录，就能把整个磁盘加进本次会话的 fs scope。
#[tauri::command]
pub fn allow_project_dirs(app: AppHandle, paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() || paths.iter().any(|p| p.trim().is_empty()) {
        return Err("paths 不能为空且元素不能为空字符串".to_string());
    }
    let home = app
        .path()
        .home_dir()
        .map_err(|error| format!("读取用户主目录失败: {error}"))?;
    let canonical_home =
        std::fs::canonicalize(&home).map_err(|error| format!("主目录不可访问: {error}"))?;
    let scope = app.fs_scope();
    for raw in &paths {
        let dir = canonical_dir(raw)?;
        // starts_with 对相等也成立，所以主目录本身要单独拒绝
        if dir == canonical_home || !dir.starts_with(&canonical_home) {
            return Err(format!("项目目录必须位于用户主目录之下: {raw}"));
        }
        scope
            .allow_directory(&dir, true)
            .map_err(|error| format!("授予目录访问范围失败 ({raw}): {error}"))?;
    }
    Ok(())
}
