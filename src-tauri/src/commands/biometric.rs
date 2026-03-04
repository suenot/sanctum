use crate::error::{Result, VaultError};
use crate::state::AppState;

#[cfg(target_os = "macos")]
mod macos {
    use crate::error::{Result, VaultError};
    use base64::{engine::general_purpose::STANDARD as B64, Engine};
    use security_framework::passwords::{
        get_generic_password, set_generic_password,
    };

    const SERVICE_NAME: &str = "com.secretvault.app";

    pub fn has_stored_key(account: &str) -> bool {
        get_generic_password(SERVICE_NAME, account).is_ok()
    }

    pub fn store_key(account: &str, key: &[u8; 32]) -> Result<()> {
        let key_b64 = B64.encode(key);
        set_generic_password(SERVICE_NAME, account, key_b64.as_bytes())
            .map_err(|e| VaultError::Biometric(format!("Keychain store failed: {}", e)))
    }

    pub fn retrieve_key(account: &str) -> Result<[u8; 32]> {
        let data = get_generic_password(SERVICE_NAME, account)
            .map_err(|e| VaultError::Biometric(format!("Keychain retrieve failed: {}", e)))?;

        let key_b64 = String::from_utf8(data)
            .map_err(|_| VaultError::Biometric("Invalid stored key encoding".to_string()))?;
        let key_bytes = B64
            .decode(&key_b64)
            .map_err(|_| VaultError::Biometric("Invalid base64 key".to_string()))?;
        if key_bytes.len() != 32 {
            return Err(VaultError::Biometric(format!(
                "Invalid key length: {} (expected 32)",
                key_bytes.len()
            )));
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(&key_bytes);
        Ok(key)
    }

    pub fn vault_account(vault_path: &str) -> String {
        use std::hash::{Hash, Hasher};
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        vault_path.hash(&mut hasher);
        format!("vault-{:x}", hasher.finish())
    }
}

#[tauri::command]
pub async fn has_biometric(state: tauri::State<'_, AppState>) -> Result<bool> {
    #[cfg(target_os = "macos")]
    {
        let vault_lock = state.vault.read().await;
        if let Some(ref vault) = *vault_lock {
            let account = macos::vault_account(&vault.file_path.to_string_lossy());
            return Ok(macos::has_stored_key(&account));
        }
        Ok(false)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = state;
        Ok(false)
    }
}

#[tauri::command]
pub async fn has_biometric_hardware() -> Result<bool> {
    #[cfg(target_os = "macos")]
    {
        // On macOS, Touch ID is available on supported hardware
        // We just check if we're on macOS — actual Touch ID check happens at Keychain level
        Ok(true)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}

#[tauri::command]
pub async fn setup_biometric(state: tauri::State<'_, AppState>) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        let vault_lock = state.vault.read().await;
        let vault = vault_lock.as_ref().ok_or(VaultError::VaultLocked)?;
        let account = macos::vault_account(&vault.file_path.to_string_lossy());
        macos::store_key(&account, &vault.key)?;
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = state;
        Err(VaultError::Biometric(
            "Biometric not supported on this platform".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn unlock_vault_biometric(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        use crate::state::UnlockedVault;
        use crate::vault::{
            format::read_vault,
            serialization::deserialize_vfs,
            crypto,
        };
        use std::path::PathBuf;
        use zeroize::Zeroizing;

        let account = macos::vault_account(&path);
        let key_raw = macos::retrieve_key(&account)?;
        let key = Zeroizing::new(key_raw);

        let (salt, nonce, ciphertext) = read_vault(std::path::Path::new(&path))?;
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
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (state, path);
        Err(VaultError::Biometric(
            "Biometric not supported on this platform".to_string(),
        ))
    }
}

#[tauri::command]
pub async fn check_biometric_for_path(path: String) -> Result<bool> {
    #[cfg(target_os = "macos")]
    {
        let account = macos::vault_account(&path);
        Ok(macos::has_stored_key(&account))
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        Ok(false)
    }
}
