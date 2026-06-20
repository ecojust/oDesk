use crate::fs_helper::get_appdata_dir;
use chrono::{Datelike, Local};
use serde::{Deserialize, Serialize};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use sysinfo::System;
use tauri::Manager;
use tokio::fs;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage_percent: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub memory_usage_percent: f32,
}

#[derive(Serialize, Deserialize)]
pub struct RuntimeDependencyStatus {
    pub name: String,
    pub installed: bool,
    pub command: Option<String>,
    pub version: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct RuntimeDependencies {
    pub node: RuntimeDependencyStatus,
    pub python: RuntimeDependencyStatus,
}

fn normalize_version_output(output: &[u8], fallback: &[u8]) -> Option<String> {
    let text = String::from_utf8_lossy(output).trim().to_string();
    if !text.is_empty() {
        return Some(text);
    }

    let fallback_text = String::from_utf8_lossy(fallback).trim().to_string();
    if fallback_text.is_empty() {
        None
    } else {
        Some(fallback_text)
    }
}

fn command_version(command: &str) -> Option<String> {
    #[cfg(target_os = "windows")]
    let output = Command::new(command)
        .arg("--version")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    #[cfg(not(target_os = "windows"))]
    let output = Command::new(command).arg("--version").output().ok()?;

    if output.status.success() {
        normalize_version_output(&output.stdout, &output.stderr)
    } else {
        None
    }
}

#[cfg(target_os = "windows")]
fn shell_command_version(command: &str) -> Option<String> {
    let output = Command::new("cmd")
        .args(["/C", &format!("{command} --version")])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;

    if output.status.success() {
        normalize_version_output(&output.stdout, &output.stderr)
    } else {
        None
    }
}

#[cfg(not(target_os = "windows"))]
fn shell_command_version(command: &str) -> Option<String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
    let script = format!("command -v {command} >/dev/null 2>&1 && {command} --version");
    let output = Command::new(shell).args(["-lc", &script]).output().ok()?;

    if output.status.success() {
        normalize_version_output(&output.stdout, &output.stderr)
    } else {
        None
    }
}

fn dependency_status(name: &str, commands: &[&str]) -> RuntimeDependencyStatus {
    for command in commands {
        if let Some(version) = command_version(command).or_else(|| shell_command_version(command)) {
            return RuntimeDependencyStatus {
                name: name.to_string(),
                installed: true,
                command: Some((*command).to_string()),
                version: Some(version),
            };
        }
    }

    RuntimeDependencyStatus {
        name: name.to_string(),
        installed: false,
        command: None,
        version: None,
    }
}

#[tauri::command]
pub fn check_runtime_dependencies() -> Result<RuntimeDependencies, String> {
    Ok(RuntimeDependencies {
        node: dependency_status("Node.js", &["node"]),
        python: dependency_status("Python", &["python3", "python", "py"]),
    })
}

#[tauri::command]
pub async fn log(newline: String) -> Result<(), String> {
    let base_dir = get_appdata_dir()?;

    let now = Local::now();
    let log_filename = format!("{:04}-{:02}-{:02}.log", now.year(), now.month(), now.day());
    let log_file = base_dir.join(log_filename);

    // Get current timestamp
    let timestamp = now.format("%Y-%m-%d %H:%M:%S").to_string();

    // Read existing content
    let mut content = fs::read_to_string(&log_file).await.ok().unwrap_or_default();
    content.push_str(&format!("\n[{}] {}", timestamp, newline));

    // Write back to file
    fs::write(log_file, &content)
        .await
        .map_err(|e| format!("Failed to write to log file: {}", e))
}

pub fn wait_for_window_closed(
    app: &tauri::AppHandle,
    window_label: &str,
    max_wait_ms: u64,
) -> Result<(), String> {
    use std::time::Instant;
    let start = Instant::now();
    let check_interval_ms = 50;

    while start.elapsed().as_millis() < max_wait_ms as u128 {
        if app.get_webview_window(window_label).is_none() {
            // 窗口已关闭
            return Ok(());
        }
        // 短暂等待后再次检查
        std::thread::sleep(std::time::Duration::from_millis(check_interval_ms));
    }

    // 超时后再次检查，如果窗口仍然存在，返回错误
    if app.get_webview_window(window_label).is_some() {
        Err(format!(
            "Window '{}' did not close within {}ms",
            window_label, max_wait_ms
        ))
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn get_system_stats() -> Result<SystemStats, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // CPU 使用率 (所有 CPU 的平均值)
    let cpu_usage_percent = sys.global_cpu_info().cpu_usage();

    // 内存信息
    let memory_used = sys.used_memory() / 1024 / 1024;
    let memory_total = sys.total_memory() / 1024 / 1024;
    let memory_usage_percent = if memory_total > 0 {
        (memory_used as f32 / memory_total as f32) * 100.0
    } else {
        0.0
    };

    Ok(SystemStats {
        memory_used,
        memory_total,
        memory_usage_percent,
        cpu_usage_percent,
    })
}

#[tauri::command]
pub fn open_executable(path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to execute: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to execute: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to execute: {}", e))?;
    }

    Ok(format!("Successfully opened: {}", path))
}

#[tauri::command]
pub async fn read_logs(date: Option<String>) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;

    let log_filename = if let Some(date_str) = date {
        format!("{}.log", date_str)
    } else {
        let now = Local::now();
        format!("{:04}-{:02}-{:02}.log", now.year(), now.month(), now.day())
    };

    let log_file = base_dir.join(log_filename);

    match fs::read_to_string(&log_file).await {
        Ok(content) => Ok(content),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok("暂无日志记录".to_string())
            } else {
                Err(format!("读取日志文件失败: {}", e))
            }
        }
    }
}

#[tauri::command]
pub async fn get_log_dates() -> Result<Vec<String>, String> {
    let base_dir = get_appdata_dir()?;
    let mut dates = Vec::new();

    let mut entries = fs::read_dir(&base_dir)
        .await
        .map_err(|e| format!("读取目录失败: {}", e))?;

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("读取目录条目失败: {}", e))?
    {
        let path = entry.path();
        if let Some(extension) = path.extension() {
            if extension == "log" {
                if let Some(file_name) = path.file_stem() {
                    if let Some(date_str) = file_name.to_str() {
                        dates.push(date_str.to_string());
                    }
                }
            }
        }
    }

    dates.sort();
    dates.reverse(); // 最新的日期在前
    Ok(dates)
}
