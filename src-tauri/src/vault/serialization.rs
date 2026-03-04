use crate::error::{Result, VaultError};
use crate::vault::vfs::VirtualFS;

pub fn serialize_vfs(vfs: &VirtualFS) -> Result<Vec<u8>> {
    rmp_serde::to_vec(vfs).map_err(|e| VaultError::Serialization(e.to_string()))
}

pub fn deserialize_vfs(data: &[u8]) -> Result<VirtualFS> {
    rmp_serde::from_slice(data).map_err(|e| VaultError::Serialization(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_roundtrip() {
        let mut vfs = VirtualFS::new();
        vfs.create_directory("/docs").unwrap();
        vfs.create_file("/docs/hello.txt", b"Hello!".to_vec())
            .unwrap();
        vfs.create_file("/binary.bin", vec![0u8, 1, 2, 255, 254])
            .unwrap();

        let data = serialize_vfs(&vfs).unwrap();
        let restored = deserialize_vfs(&data).unwrap();

        let file = restored.get_file("/docs/hello.txt").unwrap();
        assert_eq!(file.content, b"Hello!");

        let bin = restored.get_file("/binary.bin").unwrap();
        assert_eq!(bin.content, vec![0u8, 1, 2, 255, 254]);
    }
}
