use crate::{
    fs_helper::{
        compress_export_folder, export_file, get_appdata_dir, get_resources_dir, open_folder,
        read_folder_files, read_folder_files_with_message, read_folder_folders, unzip_file_to_path,
    },
    tool::log,
};
use tauri::{AppHandle, Manager};

use std::{fs, io::Read, path::PathBuf, process::Command};

use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

// 解压zip文件到指定目录
#[tauri::command]
pub async fn unzip_skill_to_workspace(
    app: AppHandle,
    skill: String,
    workspace: String,
) -> Result<String, String> {
    let resources_dir = get_resources_dir(&app).unwrap();
    let skill_dir = resources_dir.join("skills");
    let skill_zip = skill_dir.join(format!("{}.zip", skill));

    // 检查 skill_zip 文件是否存在
    if !skill_zip.exists() {
        log(format!("can not found skill: {}", skill))
            .await
            .unwrap();
        return Err(format!(
            "Skill zip file does not exist: {}",
            skill_zip.display()
        ));
    }

    let base_dir = get_appdata_dir()?;
    let skill_folder = base_dir
        .join("workspaces")
        .join(workspace.clone())
        .join(".opencode")
        .join("skill");

    // 检查目标 workspace 中是否已存在该 skill
    let skill_target_path = skill_folder.join(skill.clone());
    if skill_target_path.exists() {
        log(format!(
            "skill: {} alreadly exists in worksapce: {}",
            skill, workspace
        ))
        .await
        .unwrap();

        return Ok(format!(
            "Skill already exists in workspace: {}",
            skill_target_path.display()
        ));
    }

    println!("start to unzip_file_to_path-----");

    unzip_file_to_path(
        skill_zip.to_string_lossy().to_string(),
        skill_target_path.to_string_lossy().to_string(),
    )
    .unwrap();

    log(format!(
        "unzip_skill_to_workspace: {} to {}",
        skill, workspace
    ))
    .await
    .unwrap();

    Ok(format!(
        "Successfully unzipped {} to {}",
        base_dir.display(),
        skill_folder.display()
    ))
}

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
    let target_folder = format!("workspaces{}{}", std::path::MAIN_SEPARATOR, workspace);
    open_folder(target_folder)
}

#[tauri::command]
pub fn export_workspace_file(
    workspace: String,
    filepath: String,
    targetpath: Option<String>,
) -> Result<String, String> {
    println!("export_workspace_file file_path {}", filepath);

    let base_dir = get_appdata_dir()?;
    let source_path = base_dir
        .join("workspaces")
        .join(workspace)
        .join(filepath.to_string());

    // 如果没有提供目标路径，则使用下载目录
    let target = if let Some(target_path) = targetpath {
        target_path
    } else {
        // 获取下载目录
        let downloads_dir =
            dirs::download_dir().ok_or_else(|| "Failed to get downloads directory".to_string())?;
        downloads_dir.to_string_lossy().to_string()
    };

    let target_folder = std::path::Path::new(&target);
    let _message = export_file(
        source_path.to_string_lossy().to_string(),
        target_folder
            .join(filepath.to_string())
            .to_string_lossy()
            .to_string(),
    )?;

    let _result = open_folder(target_folder.to_string_lossy().to_string().clone());
    Ok(format!("{}", target))
    // Ok(format!("skill exported successfully: {} ", message))
}

#[tauri::command]
pub fn export_workspace_skill(
    workspace: String,
    skill: String,
    targetpath: Option<String>,
) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let skill_path = base_dir
        .join("workspaces")
        .join(workspace)
        .join(".opencode/skill")
        .join(skill.to_string());

    // 如果没有提供目标路径，则使用下载目录
    let target = if let Some(target_path) = targetpath {
        target_path
    } else {
        // 获取下载目录
        let downloads_dir =
            dirs::download_dir().ok_or_else(|| "Failed to get downloads directory".to_string())?;
        downloads_dir.to_string_lossy().to_string()
    };

    let _message =
        compress_export_folder(skill_path.to_string_lossy().to_string(), target.clone())?;

    let _result = open_folder(target.clone());
    Ok(format!("{}", target))
    // Ok(format!("skill exported successfully: {} ", message))
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

#[tauri::command]
pub fn write_workspace_file_content(
    workspace: String,
    filename: String,
    content: String,
) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let target_path = base_dir.join("workspaces").join(workspace).join(filename);

    // 通过文件扩展名自动判断类型
    let ext = target_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    // 图片格式列表
    let image_extensions = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"];

    if image_extensions.contains(&ext.as_str()) {
        // 图片类型：base64解码后写入
        // 处理可能的data URI前缀 (例如 data:image/png;base64,)
        let clean_content = if content.contains("base64,") {
            content.split_once("base64,").unwrap().1.to_string()
        } else {
            content
        };

        let decoded_bytes = base64::decode(clean_content)
            .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

        std::fs::write(&target_path, decoded_bytes)
            .map_err(|e| format!("Failed to write image file: {}", e))?;
    } else {
        // 文本类型：直接写入
        std::fs::write(&target_path, &content)
            .map_err(|e| format!("Failed to write text file: {}", e))?;
    }

    Ok("File written successfully".to_string())
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
pub fn read_workspace_file_content(workspace: String, filename: String) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let target_path = base_dir.join("workspaces").join(workspace).join(filename);

    let content =
        std::fs::read_to_string(&target_path).map_err(|e| format!("Failed to read file: {}", e))?;
    Ok(content)
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

/// 删除workspace下的skill
#[tauri::command]
pub fn delete_workspace_skill(workspace: String, skill: String) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let skill_path = base_dir
        .join("workspaces")
        .join(workspace)
        .join(".opencode/skill")
        .join(skill.to_string());

    // 检查skill是否存在
    if !skill_path.exists() {
        return Err(format!("Skill '{}' does not exist in workspace", skill));
    }

    // 删除skill目录
    fs::remove_dir_all(&skill_path)
        .map_err(|e| format!("Failed to delete skill '{}': {}", skill, e))?;

    Ok(format!(
        "Successfully deleted skill '{}' from workspace",
        skill
    ))
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

    log(format!(
        "folder: {}",
        target_workspace.to_string_lossy().to_string()
    ))
    .await
    .unwrap();

    //  opencode serve - 强制加载用户完整环境变量 (解决GUI应用PATH缺失问题)
    tokio::spawn(async move {
        #[cfg(target_os = "windows")]
        let output = Command::new("cmd")
            .args(["/C", "opencode serve"])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .current_dir(&target_workspace)
            .output()
            .await;

        #[cfg(not(target_os = "windows"))]
        let output = Command::new("zsh")
            .args(["-l", "-i", "-c", "opencode serve"])
            .env(
                "PATH",
                format!(
                    "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:{}/.cargo/bin:{}/.local/bin",
                    std::env::var("HOME").unwrap_or_default(),
                    std::env::var("HOME").unwrap_or_default()
                ),
            )
            .current_dir(&target_workspace)
            .output()
            .await;

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
                let log_content = format!("ERROR:{}\n", e);
                log(log_content).await.unwrap();
            }
        }
    });

    Ok(format!("opencode serve started successfully in "))
}

#[tauri::command]
pub fn copy_file_to_workspace(
    workspace: String,
    sourcepath: String,
    targetfilename: Option<String>,
) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let target_dir = base_dir.join("workspaces").join(workspace);

    // 检查源文件是否存在
    let source_file = std::path::Path::new(&sourcepath);
    if !source_file.exists() {
        return Err(format!("Source file does not exist: {}", sourcepath));
    }

    // 确定目标文件名
    let target_filename = if let Some(filename) = targetfilename {
        filename
    } else {
        // 如果没有提供目标文件名，使用源文件名
        source_file
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| "Failed to get source file name".to_string())?
            .to_string()
    };

    let target_path = target_dir.join(target_filename);

    // 检查目标文件是否已存在
    if target_path.exists() {
        return Err(format!(
            "Target file already exists: {}",
            target_path.display()
        ));
    }

    // 创建目标目录（如果不存在）
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create target directory: {}", e))?;

    // 复制文件
    fs::copy(&source_file, &target_path).map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(format!(
        "File successfully copied from {} to {}",
        sourcepath,
        target_path.display()
    ))
}

/// 递归删除工作区下的指定文件夹及其所有内容
#[tauri::command]
pub fn delete_workspace_folder(workspace: String, folder_path: String) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let target_path = base_dir
        .join("workspaces")
        .join(workspace)
        .join(folder_path);

    // 检查路径是否存在
    if !target_path.exists() {
        return Ok(format!("Folder does not exist: {}", target_path.display()));
    }

    // 检查是否是目录
    if !target_path.is_dir() {
        return Err(format!(
            "Path is not a directory: {}",
            target_path.display()
        ));
    }

    // 递归删除目录及所有内容
    fs::remove_dir_all(&target_path).map_err(|e| format!("Failed to delete folder: {}", e))?;

    Ok(format!(
        "Successfully deleted folder: {}",
        target_path.display()
    ))
}

/// 删除工作区下的指定单个文件
#[tauri::command]
pub fn delete_workspace_file(workspace: String, file_path: String) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;
    let target_path = base_dir.join("workspaces").join(workspace).join(file_path);

    // 检查文件是否存在
    if !target_path.exists() {
        return Ok(format!("File does not exist: {}", target_path.display()));
    }

    // 检查是否是文件
    if !target_path.is_file() {
        return Err(format!("Path is not a file: {}", target_path.display()));
    }

    // 删除文件
    fs::remove_file(&target_path).map_err(|e| format!("Failed to delete file: {}", e))?;

    Ok(format!(
        "Successfully deleted file: {}",
        target_path.display()
    ))
}
