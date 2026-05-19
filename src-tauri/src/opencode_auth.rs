use serde_json::{json, Map, Value};
use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;

fn get_opencode_auth_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Failed to get home directory".to_string())?;
    Ok(home_dir
        .join(".local")
        .join("share")
        .join("opencode")
        .join("auth.json"))
}

fn get_opencode_model_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Failed to get home directory".to_string())?;
    Ok(home_dir
        .join(".local")
        .join("state")
        .join("opencode")
        .join("model.json"))
}

#[tauri::command]
pub fn read_opencode_auth() -> Result<String, String> {
    let auth_path = get_opencode_auth_path()?;

    match fs::read_to_string(&auth_path) {
        Ok(content) => {
            if content.trim().is_empty() {
                Ok("{}".to_string())
            } else {
                Ok(content)
            }
        }
        Err(e) if e.kind() == ErrorKind::NotFound => Ok("{}".to_string()),
        Err(e) => Err(format!("Failed to read opencode auth.json: {}", e)),
    }
}

#[tauri::command]
pub fn read_opencode_model() -> Result<String, String> {
    let model_path = get_opencode_model_path()?;

    match fs::read_to_string(&model_path) {
        Ok(content) => {
            if content.trim().is_empty() {
                Ok("{}".to_string())
            } else {
                Ok(content)
            }
        }
        Err(e) if e.kind() == ErrorKind::NotFound => Ok("{}".to_string()),
        Err(e) => Err(format!("Failed to read opencode model.json: {}", e)),
    }
}

#[tauri::command]
pub fn set_opencode_auth_provider(provider_id: String, key: String) -> Result<String, String> {
    let provider_id = provider_id.trim();
    if provider_id.is_empty() {
        return Err("Provider ID is required".to_string());
    }

    let auth_path = get_opencode_auth_path()?;
    if let Some(parent) = auth_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create opencode auth directory: {}", e))?;
    }

    let mut auth_json = match fs::read_to_string(&auth_path) {
        Ok(content) if content.trim().is_empty() => Value::Object(Map::new()),
        Ok(content) => serde_json::from_str::<Value>(&content)
            .map_err(|e| format!("Failed to parse opencode auth.json: {}", e))?,
        Err(e) if e.kind() == ErrorKind::NotFound => Value::Object(Map::new()),
        Err(e) => return Err(format!("Failed to read opencode auth.json: {}", e)),
    };

    let auth_object = auth_json
        .as_object_mut()
        .ok_or_else(|| "opencode auth.json must contain a JSON object".to_string())?;

    auth_object.insert(
        provider_id.to_string(),
        json!({
            "type": "api",
            "key": key,
        }),
    );

    let serialized = serde_json::to_string_pretty(&auth_json)
        .map_err(|e| format!("Failed to serialize opencode auth.json: {}", e))?;
    fs::write(&auth_path, format!("{}\n", serialized))
        .map_err(|e| format!("Failed to write opencode auth.json: {}", e))?;

    Ok(serialized)
}
