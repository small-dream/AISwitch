use std::fs;
use tauri::command;

/// 收紧属主权限：unix 下文件 0600 / 目录 0700；非 unix 为 no-op
/// （Windows 用户目录文件默认继承仅属主 ACL，语义近似 0600）。
/// 含密钥文件落盘前必须调用，防止按 umask 默认的 0644 泄露给同机其他用户。
#[command]
pub fn restrict_to_owner(path: String) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let meta = fs::metadata(&path).map_err(|e| format!("stat 失败: {e}"))?;
        let mode = if meta.is_dir() { 0o700 } else { 0o600 };
        fs::set_permissions(&path, fs::Permissions::from_mode(mode))
            .map_err(|e| format!("chmod 失败: {e}"))?;
    }
    #[cfg(not(unix))]
    let _ = &path;
    Ok(())
}
