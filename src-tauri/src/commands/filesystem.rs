use std::path::Path;

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde::Serialize;

use crate::error::{Result, VaultError};
use crate::state::AppState;
use crate::vault::vfs::FileInfo;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum FileContent {
    Text { content: String },
    Binary { data: String, mime_type: String },
}

fn classify_extension(ext: &str) -> FileClass {
    match ext.to_lowercase().as_str() {
        // Text
        "txt" | "md" | "markdown" | "json" | "jsonc" | "yaml" | "yml" | "toml" | "xml"
        | "html" | "htm" | "css" | "scss" | "sass" | "less" | "js" | "jsx" | "ts" | "tsx"
        | "mjs" | "cjs" | "vue" | "svelte" | "py" | "rb" | "rs" | "go" | "java" | "kt"
        | "kts" | "c" | "cpp" | "cc" | "h" | "hpp" | "cs" | "swift" | "php" | "sh" | "bash"
        | "zsh" | "fish" | "ps1" | "bat" | "cmd" | "sql" | "graphql" | "gql" | "r" | "lua"
        | "pl" | "pm" | "ex" | "exs" | "erl" | "hrl" | "hs" | "lhs" | "ml" | "mli" | "elm"
        | "clj" | "cljs" | "cljc" | "lisp" | "el" | "scm" | "rkt" | "tf" | "hcl" | "ini"
        | "cfg" | "conf" | "env" | "properties" | "gitignore" | "gitattributes"
        | "dockerignore" | "editorconfig" | "log" | "csv" | "tsv" | "diff" | "patch"
        | "makefile" | "cmake" | "gradle" | "pom" | "lock" | "prisma" => FileClass::Text,

        // Images
        "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" | "ico" | "bmp" | "tiff" | "tif"
        | "avif" => FileClass::Image,

        // Binary
        _ => FileClass::Binary,
    }
}

enum FileClass {
    Text,
    Image,
    Binary,
}

fn mime_from_extension(ext: &str) -> String {
    match ext.to_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "bmp" => "image/bmp",
        "tiff" | "tif" => "image/tiff",
        "avif" => "image/avif",
        "pdf" => "application/pdf",
        _ => "application/octet-stream",
    }
    .to_string()
}

#[tauri::command]
pub async fn list_files(state: tauri::State<'_, AppState>, path: String) -> Result<Vec<FileInfo>> {
    let vault_lock = state.vault.read().await;
    let vault = vault_lock.as_ref().ok_or(VaultError::VaultLocked)?;
    vault.vfs.list_directory(&path)
}

#[tauri::command]
pub async fn read_file(state: tauri::State<'_, AppState>, path: String) -> Result<FileContent> {
    let vault_lock = state.vault.read().await;
    let vault = vault_lock.as_ref().ok_or(VaultError::VaultLocked)?;
    let file = vault.vfs.get_file(&path)?;

    let extension = Path::new(&file.name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    match classify_extension(extension) {
        FileClass::Text => {
            // Try to read as UTF-8, fall back to lossy conversion
            let content = String::from_utf8(file.content.clone())
                .unwrap_or_else(|_| String::from_utf8_lossy(&file.content).to_string());
            Ok(FileContent::Text { content })
        }
        FileClass::Image => Ok(FileContent::Binary {
            data: B64.encode(&file.content),
            mime_type: mime_from_extension(extension),
        }),
        FileClass::Binary => Ok(FileContent::Binary {
            data: B64.encode(&file.content),
            mime_type: "application/octet-stream".to_string(),
        }),
    }
}

#[tauri::command]
pub async fn write_file(
    state: tauri::State<'_, AppState>,
    path: String,
    content: String,
    is_base64: Option<bool>,
) -> Result<()> {
    let bytes = if is_base64.unwrap_or(false) {
        B64.decode(&content)
            .map_err(|e| VaultError::Io(format!("Invalid base64: {}", e)))?
    } else {
        content.into_bytes()
    };

    {
        let mut vault_lock = state.vault.write().await;
        let vault = vault_lock.as_mut().ok_or(VaultError::VaultLocked)?;
        vault.vfs.write_file(&path, bytes)?;
        vault.dirty = true;
    }

    // Auto-save after write
    super::vault::auto_save(&state).await?;

    Ok(())
}

#[tauri::command]
pub async fn create_file(state: tauri::State<'_, AppState>, path: String) -> Result<()> {
    {
        let mut vault_lock = state.vault.write().await;
        let vault = vault_lock.as_mut().ok_or(VaultError::VaultLocked)?;
        vault.vfs.create_file(&path, Vec::new())?;
        vault.dirty = true;
    }

    super::vault::auto_save(&state).await?;
    Ok(())
}

#[tauri::command]
pub async fn create_directory(state: tauri::State<'_, AppState>, path: String) -> Result<()> {
    {
        let mut vault_lock = state.vault.write().await;
        let vault = vault_lock.as_mut().ok_or(VaultError::VaultLocked)?;
        vault.vfs.create_directory(&path)?;
        vault.dirty = true;
    }

    super::vault::auto_save(&state).await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_entry(state: tauri::State<'_, AppState>, path: String) -> Result<()> {
    {
        let mut vault_lock = state.vault.write().await;
        let vault = vault_lock.as_mut().ok_or(VaultError::VaultLocked)?;
        vault.vfs.delete_entry(&path)?;
        vault.dirty = true;
    }

    super::vault::auto_save(&state).await?;
    Ok(())
}

#[tauri::command]
pub async fn move_entry(
    state: tauri::State<'_, AppState>,
    source_path: String,
    dest_dir_path: String,
) -> Result<()> {
    {
        let mut vault_lock = state.vault.write().await;
        let vault = vault_lock.as_mut().ok_or(VaultError::VaultLocked)?;
        vault.vfs.move_entry(&source_path, &dest_dir_path)?;
        vault.dirty = true;
    }

    super::vault::auto_save(&state).await?;
    Ok(())
}

#[tauri::command]
pub async fn rename_entry(
    state: tauri::State<'_, AppState>,
    old_path: String,
    new_name: String,
) -> Result<()> {
    {
        let mut vault_lock = state.vault.write().await;
        let vault = vault_lock.as_mut().ok_or(VaultError::VaultLocked)?;
        vault.vfs.rename_entry(&old_path, &new_name)?;
        vault.dirty = true;
    }

    super::vault::auto_save(&state).await?;
    Ok(())
}
