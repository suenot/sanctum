use std::fs;
use std::io::{Read, Write};
use std::path::Path;

use crate::error::{Result, VaultError};
use crate::vault::crypto::EncryptionPreset;

/// Magic bytes: "SVLT"
const MAGIC: &[u8; 4] = b"SVLT";
/// Current format version (v2 adds preset byte)
const VERSION: u16 = 2;

/// V1 header: 4 (magic) + 2 (version) + 32 (salt) + 12 (nonce) = 50 bytes
const HEADER_SIZE_V1: usize = 50;
/// V2 header: 4 (magic) + 2 (version) + 1 (preset) + 32 (salt) + 12 (nonce) = 51 bytes
const HEADER_SIZE_V2: usize = 51;

/// Write a vault file to disk atomically (v2 format)
pub fn write_vault(
    path: &Path,
    salt: &[u8; 32],
    nonce: &[u8; 12],
    preset: EncryptionPreset,
    ciphertext: &[u8],
) -> Result<()> {
    let mut data = Vec::with_capacity(HEADER_SIZE_V2 + ciphertext.len());

    // Header
    data.extend_from_slice(MAGIC);
    data.extend_from_slice(&VERSION.to_le_bytes());
    data.push(preset.to_byte());
    data.extend_from_slice(salt);
    data.extend_from_slice(nonce);

    // Payload
    data.extend_from_slice(ciphertext);

    // Atomic write: write to .tmp then rename
    let tmp_path = path.with_extension("vault.tmp");
    let mut file = fs::File::create(&tmp_path)?;
    file.write_all(&data)?;
    file.sync_all()?;
    fs::rename(&tmp_path, path)?;

    Ok(())
}

/// Read a vault file from disk, returns (preset, salt, nonce, ciphertext)
/// Supports both v1 (defaults to Standard) and v2 formats
pub fn read_vault(path: &Path) -> Result<(EncryptionPreset, [u8; 32], [u8; 12], Vec<u8>)> {
    let mut file = fs::File::open(path)?;
    let mut data = Vec::new();
    file.read_to_end(&mut data)?;

    if data.len() < HEADER_SIZE_V1 {
        return Err(VaultError::CorruptedVault("File too small".to_string()));
    }

    // Validate magic bytes
    if &data[0..4] != MAGIC {
        return Err(VaultError::CorruptedVault(
            "Invalid magic bytes".to_string(),
        ));
    }

    // Check version
    let version = u16::from_le_bytes([data[4], data[5]]);

    match version {
        1 => {
            // V1: no preset byte, default to Standard
            let mut salt = [0u8; 32];
            salt.copy_from_slice(&data[6..38]);
            let mut nonce = [0u8; 12];
            nonce.copy_from_slice(&data[38..50]);
            let ciphertext = data[50..].to_vec();
            Ok((EncryptionPreset::Standard, salt, nonce, ciphertext))
        }
        2 => {
            if data.len() < HEADER_SIZE_V2 {
                return Err(VaultError::CorruptedVault("File too small for v2".to_string()));
            }
            let preset = EncryptionPreset::from_byte(data[6])?;
            let mut salt = [0u8; 32];
            salt.copy_from_slice(&data[7..39]);
            let mut nonce = [0u8; 12];
            nonce.copy_from_slice(&data[39..51]);
            let ciphertext = data[51..].to_vec();
            Ok((preset, salt, nonce, ciphertext))
        }
        _ => Err(VaultError::CorruptedVault(format!(
            "Unsupported version: {}",
            version
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_write_and_read_vault_v2() {
        let dir = std::env::temp_dir().join("vault_test_v2");
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("test.vault");

        let salt: [u8; 32] = [1u8; 32];
        let nonce: [u8; 12] = [2u8; 12];
        let ciphertext = b"encrypted-data-here".to_vec();

        write_vault(&path, &salt, &nonce, EncryptionPreset::Paranoid, &ciphertext).unwrap();

        let (preset, read_salt, read_nonce, read_ct) = read_vault(&path).unwrap();
        assert_eq!(preset, EncryptionPreset::Paranoid);
        assert_eq!(read_salt, salt);
        assert_eq!(read_nonce, nonce);
        assert_eq!(read_ct, ciphertext);

        fs::remove_file(&path).ok();
        fs::remove_dir(&dir).ok();
    }

    #[test]
    fn test_read_v1_vault_defaults_to_standard() {
        let dir = std::env::temp_dir().join("vault_test_v1_compat");
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("v1.vault");

        // Manually write v1 format: magic + version(1) + salt + nonce + ciphertext
        let mut data = Vec::new();
        data.extend_from_slice(b"SVLT");
        data.extend_from_slice(&1u16.to_le_bytes());
        data.extend_from_slice(&[1u8; 32]); // salt
        data.extend_from_slice(&[2u8; 12]); // nonce
        data.extend_from_slice(b"ciphertext");

        fs::write(&path, &data).unwrap();

        let (preset, salt, nonce, ct) = read_vault(&path).unwrap();
        assert_eq!(preset, EncryptionPreset::Standard);
        assert_eq!(salt, [1u8; 32]);
        assert_eq!(nonce, [2u8; 12]);
        assert_eq!(ct, b"ciphertext");

        fs::remove_file(&path).ok();
        fs::remove_dir(&dir).ok();
    }

    #[test]
    fn test_invalid_magic() {
        let dir = std::env::temp_dir().join("vault_test2");
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("bad.vault");

        let mut data = vec![0u8; 60];
        data[0..4].copy_from_slice(b"BAAD"); // wrong magic
        fs::write(&path, &data).unwrap();

        let result = read_vault(&path);
        assert!(result.is_err());

        fs::remove_file(&path).ok();
        fs::remove_dir(&dir).ok();
    }
}
