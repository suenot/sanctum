use std::path::{Path, PathBuf};

use crate::error::{Result, VaultError};
use crate::state::{AppState, UnlockedVault};
use crate::vault::{
    crypto,
    format::{read_vault, write_vault},
    serialization::{deserialize_vfs, serialize_vfs},
    vfs::VirtualFS,
};


/// Persist the current vault to disk with a new random nonce
fn persist_vault(vault: &UnlockedVault) -> Result<()> {
    let plaintext = serialize_vfs(&vault.vfs)?;
    let nonce: [u8; 12] = rand::random();
    let ciphertext = crypto::encrypt(&vault.key, &nonce, &plaintext)?;
    write_vault(&vault.file_path, &vault.salt, &nonce, &ciphertext)?;
    Ok(())
}

#[tauri::command]
pub async fn create_vault(
    state: tauri::State<'_, AppState>,
    path: String,
    password: String,
) -> Result<()> {
    let salt: [u8; 32] = rand::random();
    let nonce: [u8; 12] = rand::random();
    let key = crypto::derive_key(password.as_bytes(), &salt);

    let vfs = VirtualFS::new();
    let plaintext = serialize_vfs(&vfs)?;
    let ciphertext = crypto::encrypt(&key, &nonce, &plaintext)?;

    write_vault(Path::new(&path), &salt, &nonce, &ciphertext)?;

    let mut vault_lock = state.vault.write().await;
    *vault_lock = Some(UnlockedVault {
        vfs,
        key,
        salt,
        file_path: PathBuf::from(&path),
        dirty: false,
    });

    Ok(())
}

#[tauri::command]
pub async fn unlock_vault(
    state: tauri::State<'_, AppState>,
    path: String,
    password: String,
) -> Result<()> {
    let (salt, nonce, ciphertext) = read_vault(Path::new(&path))?;
    let key = crypto::derive_key(password.as_bytes(), &salt);
    let plaintext = crypto::decrypt(&key, &nonce, &ciphertext)?;
    let vfs = deserialize_vfs(&plaintext)?;

    let mut vault_lock = state.vault.write().await;
    *vault_lock = Some(UnlockedVault {
        vfs,
        key,
        salt,
        file_path: PathBuf::from(&path),
        dirty: false,
    });

    Ok(())
}

#[tauri::command]
pub async fn lock_vault(state: tauri::State<'_, AppState>) -> Result<()> {
    let mut vault_lock = state.vault.write().await;
    if let Some(ref vault) = *vault_lock {
        if vault.dirty {
            persist_vault(vault)?;
        }
    }
    *vault_lock = None;
    Ok(())
}

#[tauri::command]
pub async fn save_vault(state: tauri::State<'_, AppState>) -> Result<()> {
    let mut vault_lock = state.vault.write().await;
    let vault = vault_lock.as_mut().ok_or(VaultError::VaultLocked)?;
    persist_vault(vault)?;
    vault.dirty = false;
    Ok(())
}

#[tauri::command]
pub async fn get_vault_path(state: tauri::State<'_, AppState>) -> Result<Option<String>> {
    let vault_lock = state.vault.read().await;
    Ok(vault_lock
        .as_ref()
        .map(|v| v.file_path.to_string_lossy().to_string()))
}

/// Helper to persist vault, used by filesystem commands
pub(crate) async fn auto_save(state: &tauri::State<'_, AppState>) -> Result<()> {
    let mut vault_lock = state.vault.write().await;
    let vault = vault_lock.as_mut().ok_or(VaultError::VaultLocked)?;
    persist_vault(vault)?;
    vault.dirty = false;
    Ok(())
}
