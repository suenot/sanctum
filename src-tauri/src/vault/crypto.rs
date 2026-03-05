use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{Algorithm, Argon2, Params, Version};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::error::{Result, VaultError};

/// Encryption preset controlling KDF parameters
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EncryptionPreset {
    Fast,     // 16 MB, 1 iteration
    Standard, // 64 MB, 3 iterations
    Paranoid, // 256 MB, 8 iterations
}

impl EncryptionPreset {
    pub fn to_byte(self) -> u8 {
        match self {
            Self::Fast => 1,
            Self::Standard => 0, // 0 = default for backwards compat
            Self::Paranoid => 2,
        }
    }

    pub fn from_byte(b: u8) -> Result<Self> {
        match b {
            0 => Ok(Self::Standard),
            1 => Ok(Self::Fast),
            2 => Ok(Self::Paranoid),
            _ => Err(VaultError::CorruptedVault(format!(
                "Unknown encryption preset: {}",
                b
            ))),
        }
    }

    fn argon2_params(self) -> (u32, u32) {
        match self {
            // (m_cost in KiB, t_cost iterations)
            Self::Fast => (16384, 1),     // 16 MB, 1 iteration
            Self::Standard => (65536, 3), // 64 MB, 3 iterations
            Self::Paranoid => (262144, 8), // 256 MB, 8 iterations
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Fast => "Fast (16 MB, 1 iter)",
            Self::Standard => "Standard (64 MB, 3 iter)",
            Self::Paranoid => "Paranoid (256 MB, 8 iter)",
        }
    }
}

/// Derive a 32-byte key from password + salt using Argon2id
pub fn derive_key(
    password: &[u8],
    salt: &[u8; 32],
    preset: EncryptionPreset,
) -> Zeroizing<[u8; 32]> {
    let (m_cost, t_cost) = preset.argon2_params();
    let params = Params::new(m_cost, t_cost, 1, Some(32)).expect("valid argon2 params");
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = Zeroizing::new([0u8; 32]);
    argon2
        .hash_password_into(password, salt, &mut *key)
        .expect("argon2 hash failed");
    key
}

/// Encrypt plaintext with AES-256-GCM
pub fn encrypt(key: &[u8; 32], nonce: &[u8; 12], plaintext: &[u8]) -> Result<Vec<u8>> {
    let cipher = Aes256Gcm::new_from_slice(key).expect("valid key size");
    let nonce = Nonce::from_slice(nonce);
    cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| VaultError::Crypto(e.to_string()))
}

/// Decrypt ciphertext with AES-256-GCM
pub fn decrypt(key: &[u8; 32], nonce: &[u8; 12], ciphertext: &[u8]) -> Result<Vec<u8>> {
    let cipher = Aes256Gcm::new_from_slice(key).expect("valid key size");
    let nonce = Nonce::from_slice(nonce);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| VaultError::InvalidPassword)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let password = b"test-password-123";
        let salt: [u8; 32] = rand::random();
        let nonce: [u8; 12] = rand::random();
        let plaintext = b"Hello, encrypted world!";

        let key = derive_key(password, &salt, EncryptionPreset::Fast);
        let ciphertext = encrypt(&key, &nonce, plaintext).unwrap();
        let decrypted = decrypt(&key, &nonce, &ciphertext).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_wrong_password_fails() {
        let salt: [u8; 32] = rand::random();
        let nonce: [u8; 12] = rand::random();
        let plaintext = b"secret data";

        let key1 = derive_key(b"correct-password", &salt, EncryptionPreset::Fast);
        let ciphertext = encrypt(&key1, &nonce, plaintext).unwrap();

        let key2 = derive_key(b"wrong-password", &salt, EncryptionPreset::Fast);
        let result = decrypt(&key2, &nonce, &ciphertext);
        assert!(result.is_err());
    }

    #[test]
    fn test_derive_key_deterministic() {
        let salt: [u8; 32] = [42u8; 32];
        let key1 = derive_key(b"password", &salt, EncryptionPreset::Fast);
        let key2 = derive_key(b"password", &salt, EncryptionPreset::Fast);
        assert_eq!(*key1, *key2);
    }

    #[test]
    fn test_different_presets_different_keys() {
        let salt: [u8; 32] = [42u8; 32];
        let key_fast = derive_key(b"password", &salt, EncryptionPreset::Fast);
        let key_std = derive_key(b"password", &salt, EncryptionPreset::Standard);
        assert_ne!(*key_fast, *key_std);
    }

    #[test]
    fn test_preset_byte_roundtrip() {
        for preset in [
            EncryptionPreset::Fast,
            EncryptionPreset::Standard,
            EncryptionPreset::Paranoid,
        ] {
            assert_eq!(
                EncryptionPreset::from_byte(preset.to_byte()).unwrap(),
                preset
            );
        }
    }
}
