use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("Vault is locked")]
    VaultLocked,
    #[error("Invalid password")]
    InvalidPassword,
    #[error("Vault file corrupted: {0}")]
    CorruptedVault(String),
    #[error("Path not found: {0}")]
    PathNotFound(String),
    #[error("Path already exists: {0}")]
    PathAlreadyExists(String),
    #[error("Not a directory: {0}")]
    NotADirectory(String),
    #[error("Not a file: {0}")]
    NotAFile(String),
    #[error("IO error: {0}")]
    Io(String),
    #[error("Crypto error: {0}")]
    Crypto(String),
    #[error("Biometric error: {0}")]
    Biometric(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
}

impl Serialize for VaultError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<std::io::Error> for VaultError {
    fn from(e: std::io::Error) -> Self {
        VaultError::Io(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, VaultError>;
