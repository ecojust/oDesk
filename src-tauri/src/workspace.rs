use crate::{
    fs_helper::{get_appdata_dir, open_folder},
    tool::log,
};
use std::{fs, process::Command};

/// 杀死所有正在运行的 opencode 进程（跨平台）
#[tauri::command]
pub fn kill_existing_opencode_processes() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("taskkill")
            .args(["/F", "/IM", "opencode.exe"])
            .output()
            .map_err(|e| format!("Failed to kill opencode processes:：{}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to kill opencode processes:：{}", stderr));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("pkill")
            .arg("-f")
            .arg("opencode")
            .output()
            .map_err(|e| format!("Failed to kill opencode processes:：{}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to kill opencode processes:：{}", stderr));
        }
    }

    Ok(())
}

/// 打开指定的工作区文件夹
#[tauri::command]
pub fn open_workspace(workspace: String) -> Result<String, String> {
    let target_folder = format!("workspaces/{}", workspace);
    open_folder(target_folder)
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
pub async fn execute_opencode_serve(workspace: String) -> Result<String, String> {
    log(" - -------------execute_opencode_serve - -----------".to_string())
        .await
        .unwrap();

    use tokio::process::Command;
    let base_dir = get_appdata_dir()?;
    let target_workspace = base_dir.join("workspaces").join(workspace);

    if let Err(e) = kill_existing_opencode_processes() {
        eprintln!("Warning: Failed to kill existing opencode processes: {}", e);
    }

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

        match output {
            Ok(output) => {
                let base_dir = match get_appdata_dir() {
                    Ok(dir) => dir,
                    Err(e) => {
                        println!("Failed to get appdata directory: {}", e);
                        return;
                    }
                };
                let log_content = format!(
                    "STDOUT:{}\nSTDERR:{}\nSTATUS: {}\n",
                    String::from_utf8_lossy(&output.stdout),
                    String::from_utf8_lossy(&output.stderr),
                    output.status
                );
                log(log_content).await.unwrap();

                if let Err(e) = open_folder(base_dir.to_string_lossy().to_string()) {
                    println!("Failed to open appdata directory: {}", e);
                }
            }
            Err(e) => {
                let log_content = format!("ERROR:{}\nSTDOUT:\nSTDERR:\nSTATUS: None\n", e);

                log(log_content).await.unwrap();
            }
        }
    });

    Ok(format!("opencode serve started successfully in "))
}
