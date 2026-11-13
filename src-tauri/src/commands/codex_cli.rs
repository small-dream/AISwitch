use std::env;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;

const STATUS_TIMEOUT: Duration = Duration::from_secs(5);
const STATUS_POLL: Duration = Duration::from_millis(25);
const LOGIN_START_GRACE: Duration = Duration::from_millis(250);

/// `codex login status` 的原始输出；状态解析留在 TS 纯函数，Rust 不代持任何凭据（PRD §5.13）。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexCliOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub executable: Option<String>,
}

/// 只有 macOS 需要回传绝对路径：ChatGPT 桌面端自带的 CLI 不在用户终端 PATH 中。
/// 其他平台继续让用户执行 `codex login`，避免 Windows 终端不认 POSIX 单引号路径。
#[cfg(target_os = "macos")]
fn executable_path(executable: &Path) -> Option<String> {
    Some(executable.display().to_string())
}

#[cfg(not(target_os = "macos"))]
fn executable_path(_executable: &Path) -> Option<String> {
    None
}

fn executable_name() -> &'static str {
    if cfg!(windows) {
        "codex.exe"
    } else {
        "codex"
    }
}

fn path_candidates() -> Vec<PathBuf> {
    let Some(path) = env::var_os("PATH") else {
        return Vec::new();
    };
    env::split_paths(&path)
        .map(|dir| dir.join(executable_name()))
        .filter(|candidate| candidate.is_file())
        .collect()
}

#[cfg(target_os = "macos")]
fn platform_candidates() -> Vec<PathBuf> {
    [
        "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex",
        "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
    ]
    .into_iter()
    .map(PathBuf::from)
    .filter(|candidate| candidate.is_file())
    .collect()
}

#[cfg(not(target_os = "macos"))]
fn platform_candidates() -> Vec<PathBuf> {
    Vec::new()
}

fn candidates() -> Vec<PathBuf> {
    let mut all = path_candidates();
    for candidate in platform_candidates() {
        if !all.contains(&candidate) {
            all.push(candidate);
        }
    }
    all
}

fn run_candidate(executable: &Path) -> io::Result<CodexCliOutput> {
    let mut child = Command::new(executable)
        .args(["login", "status"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;
    let deadline = Instant::now() + STATUS_TIMEOUT;
    loop {
        if child.try_wait()?.is_some() {
            break;
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                "codex login status timed out",
            ));
        }
        thread::sleep(STATUS_POLL);
    }
    let output = child.wait_with_output()?;
    Ok(CodexCliOutput {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        exit_code: output.status.code(),
        executable: executable_path(executable),
    })
}

fn run_status() -> Result<CodexCliOutput, String> {
    let candidates = candidates();
    if candidates.is_empty() {
        return Err("Codex CLI not found in PATH or the ChatGPT app bundle".to_string());
    }
    let mut last_error = None;
    for executable in candidates {
        match run_candidate(&executable) {
            Ok(output) => return Ok(output),
            Err(error) => last_error = Some(format!("{}: {error}", executable.display())),
        }
    }
    Err(format!(
        "Codex CLI could not be started: {}",
        last_error.unwrap_or_else(|| "unknown error".to_string())
    ))
}

/// `codex login` 会自己打开浏览器并等待本地回调；这里只负责启动，
/// 等待结束会挂住 IPC 请求，因此交给后台线程回收子进程。
fn start_candidate(executable: &Path) -> io::Result<()> {
    let mut child = Command::new(executable)
        .arg("login")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()?;
    // 给 CLI 一个很短的启动窗口：立即非零退出说明启动失败，避免 UI 误报成功
    thread::sleep(LOGIN_START_GRACE);
    if let Some(status) = child.try_wait()? {
        if status.success() {
            return Ok(());
        }
        return Err(io::Error::new(
            io::ErrorKind::Other,
            format!("codex login exited early with {status}"),
        ));
    }
    thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}

fn run_login() -> Result<(), String> {
    let candidates = candidates();
    if candidates.is_empty() {
        return Err("Codex CLI not found in PATH or the ChatGPT app bundle".to_string());
    }
    let mut last_error = None;
    for executable in candidates {
        match start_candidate(&executable) {
            Ok(()) => return Ok(()),
            Err(error) => last_error = Some(format!("{}: {error}", executable.display())),
        }
    }
    Err(format!(
        "Codex CLI could not be started: {}",
        last_error.unwrap_or_else(|| "unknown error".to_string())
    ))
}

/// 固定执行 `codex login status`，不接受前端传入命令或参数，避免扩大命令执行面。
#[tauri::command]
pub async fn codex_login_status() -> Result<CodexCliOutput, String> {
    tauri::async_runtime::spawn_blocking(run_status)
        .await
        .map_err(|error| format!("Codex login status task failed: {error}"))?
}

/// 固定启动 `codex login`，不接受前端传入命令或参数；登录流程与凭据都由 CLI 自己处理。
#[tauri::command]
pub async fn codex_login() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(run_login)
        .await
        .map_err(|error| format!("Codex login task failed: {error}"))?
}
