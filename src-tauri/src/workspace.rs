use crate::{
    fs_helper::{
        compress_export_folder, get_appdata_dir, open_folder, read_folder_files,
        read_folder_files_with_message, read_folder_folders,
    },
    tool::log,
};

use std::{fs, path::PathBuf, process::Command};

use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

/// 杀死所有正在运行的 opencode 进程（跨平台）
#[tauri::command]
pub async fn kill_existing_opencode_processes() -> Result<(), String> {
    log("kill_existing_opencode_processes-----".to_string())
        .await
        .unwrap();

    #[cfg(target_os = "windows")]
    let output = Command::new("taskkill")
        .args(["/F", "/IM", "opencode.exe"])
        .output()
        .map_err(|e| format!("Failed to kill opencode processes:：{}", e))?;

    #[cfg(not(target_os = "windows"))]
    let output = Command::new("pkill")
        .arg("-f")
        .arg("opencode")
        .output()
        .map_err(|e| format!("Failed to kill opencode processes: {}", e))?;

    // 打印日志
    let log_content = format!(
        "STDOUT:{}\nSTDERR:{}\nSTATUS: {}\n",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
        output.status
    );
    log(log_content).await.unwrap();

    Ok(())
}

/// 打开指定的工作区文件夹
#[tauri::command]
pub fn open_workspace(workspace: String) -> Result<String, String> {
    let target_folder = format!("workspaces/{}", workspace);
    open_folder(target_folder)
}

#[tauri::command]
pub fn export_workspace_skill(
    workspace: String,
    skill: String,
    target_path: Option<String>,
) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let skill_path = base_dir
        .join("workspaces")
        .join(workspace)
        .join(".opencode/skill")
        .join(skill.to_string());

    // 如果没有提供目标路径，则使用下载目录
    let target = if let Some(target_path) = target_path {
        target_path
    } else {
        // 获取下载目录
        let downloads_dir =
            dirs::download_dir().ok_or_else(|| "Failed to get downloads directory".to_string())?;
        downloads_dir.to_string_lossy().to_string()
    };

    let result = compress_export_folder(skill_path.to_string_lossy().to_string(), target)?;
    Ok(format!("skill exported successfully: {} ", skill))
}

/// 创建新的工作区目录
#[tauri::command]
pub fn create_workspace(workspace: String) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let target_path = base_dir.join("workspaces").join(workspace);

    fs::create_dir_all(&target_path).map_err(|e| format!("Failed to create directory：{}", e))?;

    Ok(format!(
        "worksapce created successfully：{}",
        target_path.display()
    ))
}

/// 向工作区中的文件追加一行文本（不存在则自动创建）
#[tauri::command]
pub fn workspace_file_insert_text(
    workspace: String,
    filename: String,
    newline: String,
) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let file_path = base_dir.join("workspaces").join(workspace).join(filename);

    println!("workspace_file_insert_text：{}", newline);

    let mut content = fs::read_to_string(&file_path).unwrap_or_default();
    content.push_str(&format!("\n{}", newline));

    fs::write(&file_path, &content).map_err(|e| format!("Failed to write to file：{}", e))?;

    Ok(format!(
        "Successfully inserted line into file：{}",
        file_path.display()
    ))
}

#[tauri::command]
pub async fn scan_worksapce_file(
    workspace: String,
    path: String,
) -> Result<Vec<(String, String)>, String> {
    let log_content = format!("scan files: \nworkspace:{}\npath: {}\n", workspace, path);
    log(log_content).await.unwrap();

    let base_dir = get_appdata_dir()?;
    let folder_path = base_dir.join("workspaces").join(workspace).join(path);
    let all_files = read_folder_files_with_message(folder_path.to_string_lossy().to_string())?;

    // for file in &all_files {
    //     let ext = PathBuf::from(file)
    //         .extension()
    //         .and_then(|ext| ext.to_str())
    //         .unwrap_or("")
    //         .to_lowercase();
    //     if ext != postfix {
    //         println!("Skipping non-{} file: {}", postfix, file);
    //         continue; // 跳过非图片文件
    //     }

    //     files.push(file.clone());
    // }
    Ok(all_files)
}

#[tauri::command]
pub async fn scan_worksapce_folder(workspace: String, path: String) -> Result<Vec<String>, String> {
    let log_content = format!("scan files: \nworkspace:{}\npath: {}", workspace, path);
    log(log_content).await.unwrap();

    let base_dir = get_appdata_dir()?;
    let folder_path = base_dir.join("workspaces").join(workspace).join(path);
    let all_folders = read_folder_folders(folder_path.to_string_lossy().to_string())?;

    Ok(all_folders)
}

#[tauri::command]
pub async fn execute_opencode_serve(
    app: tauri::AppHandle,
    workspace: String,
) -> Result<String, String> {
    log(" - -------------execute_opencode_serve - -----------".to_string())
        .await
        .unwrap();

    use tokio::process::Command;
    let base_dir = get_appdata_dir()?;
    let target_workspace = base_dir.join("workspaces").join(workspace);

    // if let Err(e) = kill_existing_opencode_processes() {
    //     eprintln!("Warning: Failed to kill existing opencode processes: {}", e);
    // }

    //  opencode serve
    tokio::spawn(async move {
        #[cfg(target_os = "windows")]
        let output = Command::new("cmd")
            .args(["/C", "opencode serve"])
            .current_dir(&target_workspace)
            .output()
            .await;

        #[cfg(not(target_os = "windows"))]
        let output = Command::new("bash")
            .args(["-l", "-c", "opencode serve"])
            .current_dir(&target_workspace)
            .output()
            .await;
        // let sidecar_command = app.shell().sidecar("opencode").unwrap().arg("serve");
        // let (mut rx, mut _child) = sidecar_command.spawn().expect("Failed to spawn sidecar");
        // let sidecar_command = app.shell().sidecar("opencode").unwrap().arg("serve");
        // let output = sidecar_command.output();
        // let response = String::from_utf8(output.stdout).unwrap();

        match output {
            Ok(output) => {
                let log_content = format!(
                    "STDOUT:{}\nSTDERR:{}\nSTATUS: {}\n",
                    String::from_utf8_lossy(&output.stdout),
                    String::from_utf8_lossy(&output.stderr),
                    output.status
                );
                log(log_content).await.unwrap();
            }
            Err(e) => {
                let log_content = format!("ERROR:{}\nSTDOUT:\nSTDERR:\nSTATUS: None\n", e);
                log(log_content).await.unwrap();
            }
        }
    });

    Ok(format!("opencode serve started successfully in "))
}
