use chrono::{DateTime, Local, Utc};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri_plugin_resource;

// 获取软件报哪的resources目录
pub fn get_resources_dir() -> Result<std::path::PathBuf, String> {
    // 使用 tauri-plugin-resource 插件获取 resources 目录
    let resources_dir = tauri_plugin_resource::get_resources_dir()
        .map_err(|e| format!("Failed to get resources directory: {}", e))?;

    // 确保目录存在
    fs::create_dir_all(&resources_dir)
        .map_err(|e| format!("Failed to create resources directory: {}", e))?;

    Ok(resources_dir)
}
// 获取 appdata 目录下的 oDesk 路径
pub fn get_appdata_dir() -> Result<std::path::PathBuf, String> {
    let app_data =
        dirs::data_dir().ok_or_else(|| "Failed to get app data directory".to_string())?;

    let app_dir = app_data.join("oDesk");

    // 确保目录存在
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    Ok(app_dir)
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<String, String> {
    // 获取 appdata 目录下的 oDesk 路径
    let base_dir = get_appdata_dir()?;

    let resource_dir = base_dir.join(path);

    // 确保目录存在
    fs::create_dir_all(&resource_dir)
        .map_err(|e| format!("Failed to create resource directory: {}", e))?;

    // 根据不同平台打开文件夹
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&resource_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&resource_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&resource_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(format!("Opened folder: {}", resource_dir.display()))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<String, String> {
    // 获取 appdata 目录下的 oDesk 路径
    let base_dir = get_appdata_dir()?;

    let target_path = base_dir.join(path);

    std::fs::write(&target_path, &content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok("File written successfully".to_string())
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    // 获取 appdata 目录下的 oDesk 路径
    let base_dir = get_appdata_dir()?;

    let target_path = base_dir.join(path);

    let content =
        std::fs::read_to_string(&target_path).map_err(|e| format!("Failed to read file: {}", e))?;
    Ok(content)
}

#[tauri::command]
pub fn read_folder_files(path: String) -> Result<Vec<String>, String> {
    // 确保目录存在
    fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create wallpaper_static directory: {}", e))?;

    // 读取目录中的文件
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read wallpaper_static directory: {}", e))?;

    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        // let file_name = entry.file_name();

        // 只处理文件，跳过目录
        if path.is_file() {
            if let Some(path_str) = path.to_str() {
                files.push(path_str.to_string());
            }
        }
    }

    // 按文件名排序
    files.sort();

    Ok(files)
}

#[tauri::command]
pub fn read_folder_files_with_message(path: String) -> Result<Vec<(String, String)>, String> {
    // 确保目录存在
    fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create wallpaper_static directory: {}", e))?;

    // 读取目录中的文件
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read wallpaper_static directory: {}", e))?;

    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        // 只处理文件，跳过目录
        if path.is_file() {
            if let Some(path_str) = path.to_str() {
                // 获取文件修改时间
                let metadata = fs::metadata(&path)
                    .map_err(|e| format!("Failed to get file metadata: {}", e))?;
                let modified_time = metadata
                    .modified()
                    .map_err(|e| format!("Failed to get file modified time: {}", e))?;
                let modified_time_str = modified_time
                    .duration_since(std::time::UNIX_EPOCH)
                    .map_err(|e| format!("Failed to convert time: {}", e))?
                    .as_secs();
                let datetime: DateTime<Utc> = DateTime::from_timestamp(modified_time_str as i64, 0)
                    .ok_or_else(|| "Invalid timestamp".to_string())?;
                let local_datetime = datetime.with_timezone(&Local);
                let modified_time_str = local_datetime.format("%Y-%m-%d %H:%M:%S").to_string();

                files.push((path_str.to_string(), modified_time_str));
            }
        }
    }

    // 按文件名排序
    files.sort_by(|a, b| a.0.cmp(&b.0));

    Ok(files)
}

#[tauri::command]
pub fn read_folder_folders(path: String) -> Result<Vec<String>, String> {
    // 确保目录存在
    fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create wallpaper_static directory: {}", e))?;

    // 读取目录中的文件
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read wallpaper_static directory: {}", e))?;

    let mut folders = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        // let file_name = entry.file_name();

        // 只处理目录，跳过文件
        if !path.is_file() {
            if let Some(path_str) = path.to_str() {
                folders.push(path_str.to_string());
            }
        }
    }

    // 按文件名排序
    folders.sort();

    Ok(folders)
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<String, String> {
    let base_dir = get_appdata_dir()?;

    let target_path = base_dir.join(path);

    // 创建目录，如果已存在则不会失败
    fs::create_dir_all(&target_path).map_err(|e| format!("Failed to create directory: {}", e))?;

    Ok(format!(
        "Directory created successfully: {}",
        target_path.display()
    ))
}

#[tauri::command]
pub fn unzip_file_to_path(
    zip_file_path: String,
    target_folder_path: String,
) -> Result<String, String> {
    let zip_file = std::path::Path::new(&zip_file_path);
    let target_path = std::path::Path::new(&target_folder_path);

    // 确保目标目录存在
    fs::create_dir_all(&target_path)
        .map_err(|e| format!("Failed to create target directory: {}", e))?;

    // 打开zip文件
    let file = fs::File::open(&zip_file).map_err(|e| format!("Failed to open zip file: {}", e))?;
    let mut zip =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip file: {}", e))?;

    // 解压所有文件
    for i in 0..zip.len() {
        let mut file = zip
            .by_index(i)
            .map_err(|e| format!("Failed to get file from zip: {}", e))?;
        let outpath = target_path.join(file.name());

        // 创建目录（如果文件在子目录中）
        if let Some(p) = outpath.parent() {
            if !p.exists() {
                fs::create_dir_all(&p).map_err(|e| format!("Failed to create directory: {}", e))?;
            }
        }

        // 写入文件
        let mut outfile =
            fs::File::create(&outpath).map_err(|e| format!("Failed to create file: {}", e))?;
        std::io::copy(&mut file, &mut outfile)
            .map_err(|e| format!("Failed to write file: {}", e))?;
    }

    Ok(format!(
        "Successfully unzipped {} to {}",
        zip_file.display(),
        target_path.display()
    ))
}

#[tauri::command]
pub fn compress_export_folder(source_path: String, target_path: String) -> Result<String, String> {
    let source = std::path::Path::new(&source_path);

    if !source.exists() {
        return Err(format!("Source folder does not exist: {}", source_path));
    }

    if !source.is_dir() {
        return Err(format!("Source path is not a directory: {}", source_path));
    }

    let target_path = std::path::Path::new(&target_path);

    // 创建目标目录
    fs::create_dir_all(target_path)
        .map_err(|e| format!("Failed to create target directory: {}", e))?;

    // 压缩源文件夹并导出
    compress_and_export(source, target_path)?;

    Ok(format!(
        "Folder exported successfully from {} to {}",
        source_path,
        target_path.display()
    ))
}

fn copy_dir_recursive(source: &std::path::Path, target: &std::path::Path) -> Result<(), String> {
    if !source.is_dir() {
        return Err("Source is not a directory".to_string());
    }

    if !target.exists() {
        fs::create_dir_all(target)
            .map_err(|e| format!("Failed to create target directory: {}", e))?;
    }

    for entry in
        fs::read_dir(source).map_err(|e| format!("Failed to read source directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        let file_name = entry.file_name();

        let target_path = target.join(file_name);

        if path.is_dir() {
            // 递归复制子目录
            copy_dir_recursive(&path, &target_path)?;
        } else {
            // 复制文件
            fs::copy(&path, &target_path).map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }

    Ok(())
}

fn compress_and_export(source: &Path, target: &Path) -> Result<(), String> {
    // 生成压缩文件名（使用源文件夹名 + .zip）
    let folder_name = source
        .file_name()
        .ok_or_else(|| "Failed to get folder name".to_string())?;
    let zip_file_name = format!("{}.zip", folder_name.to_string_lossy());
    let zip_path = target.join(zip_file_name);

    // 创建压缩文件
    let zip_file =
        fs::File::create(&zip_path).map_err(|e| format!("Failed to create zip file: {}", e))?;
    let mut zip = zip::ZipWriter::new(zip_file);

    // 递归添加文件到压缩包
    add_dir_to_zip(source, source, &mut zip)?;

    // 完成压缩
    zip.finish()
        .map_err(|e| format!("Failed to finish zip: {}", e))?;

    Ok(())
}

fn add_dir_to_zip(
    source_dir: &Path,
    current_dir: &Path,
    zip: &mut zip::ZipWriter<fs::File>,
) -> Result<(), String> {
    let options = zip::write::FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    for entry in
        fs::read_dir(current_dir).map_err(|e| format!("Failed to read directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        let file_name = entry.file_name();

        let relative_path = path
            .strip_prefix(source_dir)
            .map_err(|e| format!("Failed to strip prefix: {}", e))?;

        if path.is_dir() {
            // 添加目录条目
            let dir_path = relative_path.to_path_buf();
            zip.add_directory(dir_path.to_string_lossy(), options)
                .map_err(|e| format!("Failed to add directory to zip: {}", e))?;

            // 递归处理子目录
            add_dir_to_zip(source_dir, &path, zip)?;
        } else {
            // 添加文件
            zip.start_file(relative_path.to_string_lossy(), options)
                .map_err(|e| format!("Failed to start file in zip: {}", e))?;

            let mut file =
                fs::File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
            std::io::copy(&mut file, zip)
                .map_err(|e| format!("Failed to copy file to zip: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn export_file(source_path: String, target_path: String) -> Result<String, String> {
    let source = std::path::Path::new(&source_path);

    println!("export_file {}", source_path);
    println!("export_file {}", target_path);

    if !source.exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    if !source.is_file() {
        return Err(format!("Source path is not a file: {}", source_path));
    }

    let target_path = std::path::Path::new(&target_path);

    // 创建目标目录
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create target directory: {}", e))?;
    }

    // 复制文件
    fs::copy(source, target_path).map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(format!(
        "File exported successfully from {} to {}",
        source_path,
        target_path.display()
    ))
}
