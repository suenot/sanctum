use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{Algorithm, Argon2, Params, Version};
use zeroize::Zeroizing;

use crate::error::{Result, VaultError};

/// Derive a 32-byte key from password + salt using Argon2id
pub fn derive_key(password: &[u8], salt: &[u8; 32]) -> Zeroizing<[u8; 32]> {
    // m_cost=64MB, t_cost=3, p_cost=1
    let params = Params::new(65536, 3, 1, Some(32)).expect("valid argon2 params");
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

        let key = derive_key(password, &salt);
        let ciphertext = encrypt(&key, &nonce, plaintext).unwrap();
        let decrypted = decrypt(&key, &nonce, &ciphertext).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_wrong_password_fails() {
        let salt: [u8; 32] = rand::random();
        let nonce: [u8; 12] = rand::random();
        let plaintext = b"secret data";

        let key1 = derive_key(b"correct-password", &salt);
        let ciphertext = encrypt(&key1, &nonce, plaintext).unwrap();

        let key2 = derive_key(b"wrong-password", &salt);
        let result = decrypt(&key2, &nonce, &ciphertext);
        assert!(result.is_err());
    }

    #[test]
    fn test_derive_key_deterministic() {
        let salt: [u8; 32] = [42u8; 32];
        let key1 = derive_key(b"password", &salt);
        let key2 = derive_key(b"password", &salt);
        assert_eq!(*key1, *key2);
    }
}
