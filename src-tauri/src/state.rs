use std::path::PathBuf;
use tokio::sync::RwLock;
use zeroize::Zeroizing;

use crate::vault::crypto::EncryptionPreset;
use crate::vault::vfs::VirtualFS;

pub struct UnlockedVault {
    pub vfs: VirtualFS,
    pub key: Zeroizing<[u8; 32]>,
    pub salt: [u8; 32],
    pub preset: EncryptionPreset,
    pub file_path: PathBuf,
    pub dirty: bool,
}

pub struct AppState {
    pub vault: RwLock<Option<UnlockedVault>>,
}
