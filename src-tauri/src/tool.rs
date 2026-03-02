use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Command;
use sysinfo::System;
use tauri::Manager;

use crate::fs_helper::get_appdata_dir;

// Helper function to kill existing opencode processes
fn kill_existing_opencode_processes() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("taskkill")
            .args(["/F", "/IM", "opencode.exe"])
            .output()
            .map_err(|e| format!("Failed to kill opencode processes: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to kill opencode processes: {}", stderr));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("pkill")
            .arg("-f")
            .arg("opencode")
            .output()
            .map_err(|e| format!("Failed to kill opencode processes: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to kill opencode processes: {}", stderr));
        }

        println!("opencode process closed");
    }

    Ok(())
}

/// 等待窗口完全关闭的辅助函数
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

#[derive(Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage_percent: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub memory_usage_percent: f32,
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
pub fn create_workspace(workspace: String) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let target_workspace = base_dir.join("workspaces").join(workspace);

    // 创建目录，如果已存在则不会失败
    fs::create_dir_all(&target_workspace)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    Ok(format!(
        "worksapce created successfully: {}",
        target_workspace.display()
    ))
}

#[tauri::command]
pub async fn execute_opencode_serve(workspace: String) -> Result<String, String> {
    use tokio::process::Command;
    let base_dir = get_appdata_dir()?;
    let target_workspace = base_dir.join("workspaces").join(workspace);

    // 先杀死已有的 opencode 进程
    if let Err(e) = kill_existing_opencode_processes() {
        eprintln!("Warning: Failed to kill existing opencode processes: {}", e);
    }

    // 在后台异步执行 opencode serve
    tokio::spawn(async move {
        let output = Command::new("opencode")
            .arg("serve")
            .current_dir(target_workspace)
            .output()
            .await
            .map_err(|e| format!("Failed to execute opencode serve: {}", e));

        if let Ok(output) = output {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                eprintln!("opencode serve failed with error: {}", stderr);
            }
        } else {
            eprintln!("opencode serve execution failed");
        }
    });
    println!("opencode serve started successfully");

    Ok(format!("opencode serve started successfully in ",))
}
