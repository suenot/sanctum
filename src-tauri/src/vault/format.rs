use std::fs;
use std::io::{Read, Write};
use std::path::Path;

use crate::error::{Result, VaultError};

/// Magic bytes: "SVLT"
const MAGIC: &[u8; 4] = b"SVLT";
/// Format version
const VERSION: u16 = 1;

/// Header size: 4 (magic) + 2 (version) + 32 (salt) + 12 (nonce) = 50 bytes
const HEADER_SIZE: usize = 50;

/// Write a vault file to disk atomically
pub fn write_vault(
    path: &Path,
    salt: &[u8; 32],
    nonce: &[u8; 12],
    ciphertext: &[u8],
) -> Result<()> {
    let mut data = Vec::with_capacity(HEADER_SIZE + ciphertext.len());

    // Header
    data.extend_from_slice(MAGIC);
    data.extend_from_slice(&VERSION.to_le_bytes());
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

/// Read a vault file from disk, returns (salt, nonce, ciphertext)
pub fn read_vault(path: &Path) -> Result<([u8; 32], [u8; 12], Vec<u8>)> {
    let mut file = fs::File::open(path)?;
    let mut data = Vec::new();
    file.read_to_end(&mut data)?;

    if data.len() < HEADER_SIZE {
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
    if version != VERSION {
        return Err(VaultError::CorruptedVault(format!(
            "Unsupported version: {}",
            version
        )));
    }

    // Extract salt
    let mut salt = [0u8; 32];
    salt.copy_from_slice(&data[6..38]);

    // Extract nonce
    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&data[38..50]);

    // Extract ciphertext
    let ciphertext = data[50..].to_vec();

    Ok((salt, nonce, ciphertext))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_write_and_read_vault() {
        let dir = std::env::temp_dir().join("vault_test");
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("test.vault");

        let salt: [u8; 32] = [1u8; 32];
        let nonce: [u8; 12] = [2u8; 12];
        let ciphertext = b"encrypted-data-here".to_vec();

        write_vault(&path, &salt, &nonce, &ciphertext).unwrap();

        let (read_salt, read_nonce, read_ct) = read_vault(&path).unwrap();
        assert_eq!(read_salt, salt);
        assert_eq!(read_nonce, nonce);
        assert_eq!(read_ct, ciphertext);

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
