#[cfg(unix)]
use std::fs;
use tauri::command;

/// 收紧属主权限：unix 下文件 0600 / 目录 0700。
///
/// Windows 上没有任何操作（返回 Ok）：NTFS 没有 POSIX mode 位，真正的「仅属主」
/// 要靠 DACL 实现；用户主目录下的文件默认只继承当前用户与系统账户的 ACL，语义近似 0600，
/// 因此这里显式记为「未做额外收紧」，不要把它当成已强制校验的安全保证（PRD §7.3）。
/// 含密钥文件落盘前必须调用，防止按 umask 默认的 0644 泄露给同机其他用户。
#[command]
pub fn restrict_to_owner(path: String) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        // 用 symlink_metadata 拒绝符号链接：否则 dotfile 管理器/同步盘留下的链接会让
        // chmod 作用到 HOME 之外的目标文件（也存在 stat 与 chmod 之间的 TOCTOU 窗口）
        let meta = fs::symlink_metadata(&path).map_err(|e| format!("stat 失败: {e}"))?;
        if meta.file_type().is_symlink() {
            return Err(format!("拒绝收紧符号链接权限: {path}"));
        }
        let mode = if meta.is_dir() { 0o700 } else { 0o600 };
        fs::set_permissions(&path, fs::Permissions::from_mode(mode))
            .map_err(|e| format!("chmod 失败: {e}"))?;
    }
    #[cfg(not(unix))]
    let _ = &path;
    Ok(())
}
