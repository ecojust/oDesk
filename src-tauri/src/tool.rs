use crate::fs_helper::get_appdata_dir;
use chrono::{Datelike, Local};
use serde::{Deserialize, Serialize};
use std::process::Command;
use sysinfo::System;
use tauri::Manager;
use tokio::fs;

#[derive(Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage_percent: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub memory_usage_percent: f32,
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
    let existing_content = fs::read_to_string(&log_file).await.ok().unwrap_or_default();

    // Create new log entry with timestamp
    let new_content = format!("{} \n[{}] {}", existing_content, timestamp, newline);

    // Write back to file
    fs::write(log_file, new_content)
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
