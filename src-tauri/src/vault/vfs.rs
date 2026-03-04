use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::{Result, VaultError};

fn now_ts() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualFS {
    pub root: VfsDirectory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VfsDirectory {
    pub name: String,
    pub entries: BTreeMap<String, VfsEntry>,
    pub created: u64,
    pub modified: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VfsEntry {
    File(VfsFile),
    Directory(VfsDirectory),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VfsFile {
    pub name: String,
    #[serde(with = "serde_bytes")]
    pub content: Vec<u8>,
    pub created: u64,
    pub modified: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub created: u64,
    pub modified: u64,
}

impl VirtualFS {
    pub fn new() -> Self {
        let ts = now_ts();
        VirtualFS {
            root: VfsDirectory {
                name: String::new(),
                entries: BTreeMap::new(),
                created: ts,
                modified: ts,
            },
        }
    }

    /// Split a path like "/foo/bar/baz.txt" into ["foo", "bar", "baz.txt"]
    fn split_path(path: &str) -> Vec<&str> {
        path.trim_matches('/').split('/').filter(|s| !s.is_empty()).collect()
    }

    /// Get a reference to a directory by path
    pub fn get_directory(&self, path: &str) -> Result<&VfsDirectory> {
        let parts = Self::split_path(path);
        let mut current = &self.root;

        for part in &parts {
            match current.entries.get(*part) {
                Some(VfsEntry::Directory(dir)) => current = dir,
                Some(VfsEntry::File(_)) => {
                    return Err(VaultError::NotADirectory(path.to_string()));
                }
                None => {
                    return Err(VaultError::PathNotFound(path.to_string()));
                }
            }
        }

        Ok(current)
    }

    /// Get a mutable reference to a directory by path
    fn get_directory_mut(&mut self, path: &str) -> Result<&mut VfsDirectory> {
        let parts = Self::split_path(path);
        let mut current = &mut self.root;

        for part in parts {
            let entry = current
                .entries
                .get_mut(part)
                .ok_or_else(|| VaultError::PathNotFound(path.to_string()))?;
            match entry {
                VfsEntry::Directory(dir) => current = dir,
                VfsEntry::File(_) => {
                    return Err(VaultError::NotADirectory(path.to_string()));
                }
            }
        }

        Ok(current)
    }

    /// Get a reference to a file by path
    pub fn get_file(&self, path: &str) -> Result<&VfsFile> {
        let parts = Self::split_path(path);
        if parts.is_empty() {
            return Err(VaultError::NotAFile("/".to_string()));
        }

        let (file_name, dir_parts) = parts.split_last().unwrap();
        let dir_path = if dir_parts.is_empty() {
            "/".to_string()
        } else {
            format!("/{}", dir_parts.join("/"))
        };

        let dir = self.get_directory(&dir_path)?;
        match dir.entries.get(*file_name) {
            Some(VfsEntry::File(f)) => Ok(f),
            Some(VfsEntry::Directory(_)) => Err(VaultError::NotAFile(path.to_string())),
            None => Err(VaultError::PathNotFound(path.to_string())),
        }
    }

    /// List entries in a directory
    pub fn list_directory(&self, path: &str) -> Result<Vec<FileInfo>> {
        let dir = self.get_directory(path)?;
        let base_path = if path == "/" || path.is_empty() {
            String::new()
        } else {
            path.trim_end_matches('/').to_string()
        };

        let mut entries = Vec::new();
        for (name, entry) in &dir.entries {
            let entry_path = format!("{}/{}", base_path, name);
            match entry {
                VfsEntry::File(f) => entries.push(FileInfo {
                    name: name.clone(),
                    path: entry_path,
                    is_directory: false,
                    size: f.content.len() as u64,
                    created: f.created,
                    modified: f.modified,
                }),
                VfsEntry::Directory(d) => entries.push(FileInfo {
                    name: name.clone(),
                    path: entry_path,
                    is_directory: true,
                    size: 0,
                    created: d.created,
                    modified: d.modified,
                }),
            }
        }

        Ok(entries)
    }

    /// Create a file at the given path
    pub fn create_file(&mut self, path: &str, content: Vec<u8>) -> Result<()> {
        let parts = Self::split_path(path);
        if parts.is_empty() {
            return Err(VaultError::PathAlreadyExists("/".to_string()));
        }

        let (file_name, dir_parts) = parts.split_last().unwrap();
        let dir_path = if dir_parts.is_empty() {
            "/".to_string()
        } else {
            format!("/{}", dir_parts.join("/"))
        };

        let dir = self.get_directory_mut(&dir_path)?;
        if dir.entries.contains_key(*file_name) {
            return Err(VaultError::PathAlreadyExists(path.to_string()));
        }

        let ts = now_ts();
        dir.entries.insert(
            file_name.to_string(),
            VfsEntry::File(VfsFile {
                name: file_name.to_string(),
                content,
                created: ts,
                modified: ts,
            }),
        );
        dir.modified = ts;

        Ok(())
    }

    /// Write content to an existing file, or create it if it doesn't exist
    pub fn write_file(&mut self, path: &str, content: Vec<u8>) -> Result<()> {
        let parts = Self::split_path(path);
        if parts.is_empty() {
            return Err(VaultError::NotAFile("/".to_string()));
        }

        let (file_name, dir_parts) = parts.split_last().unwrap();
        let dir_path = if dir_parts.is_empty() {
            "/".to_string()
        } else {
            format!("/{}", dir_parts.join("/"))
        };

        let dir = self.get_directory_mut(&dir_path)?;
        let ts = now_ts();

        match dir.entries.get_mut(*file_name) {
            Some(VfsEntry::File(f)) => {
                f.content = content;
                f.modified = ts;
            }
            Some(VfsEntry::Directory(_)) => {
                return Err(VaultError::NotAFile(path.to_string()));
            }
            None => {
                dir.entries.insert(
                    file_name.to_string(),
                    VfsEntry::File(VfsFile {
                        name: file_name.to_string(),
                        content,
                        created: ts,
                        modified: ts,
                    }),
                );
            }
        }
        dir.modified = ts;

        Ok(())
    }

    /// Create a directory at the given path
    pub fn create_directory(&mut self, path: &str) -> Result<()> {
        let parts = Self::split_path(path);
        if parts.is_empty() {
            return Err(VaultError::PathAlreadyExists("/".to_string()));
        }

        let (dir_name, parent_parts) = parts.split_last().unwrap();
        let parent_path = if parent_parts.is_empty() {
            "/".to_string()
        } else {
            format!("/{}", parent_parts.join("/"))
        };

        let parent = self.get_directory_mut(&parent_path)?;
        if parent.entries.contains_key(*dir_name) {
            return Err(VaultError::PathAlreadyExists(path.to_string()));
        }

        let ts = now_ts();
        parent.entries.insert(
            dir_name.to_string(),
            VfsEntry::Directory(VfsDirectory {
                name: dir_name.to_string(),
                entries: BTreeMap::new(),
                created: ts,
                modified: ts,
            }),
        );
        parent.modified = ts;

        Ok(())
    }

    /// Delete an entry (file or directory) at the given path
    pub fn delete_entry(&mut self, path: &str) -> Result<()> {
        let parts = Self::split_path(path);
        if parts.is_empty() {
            return Err(VaultError::PathNotFound("/".to_string()));
        }

        let (entry_name, parent_parts) = parts.split_last().unwrap();
        let parent_path = if parent_parts.is_empty() {
            "/".to_string()
        } else {
            format!("/{}", parent_parts.join("/"))
        };

        let parent = self.get_directory_mut(&parent_path)?;
        if parent.entries.remove(*entry_name).is_none() {
            return Err(VaultError::PathNotFound(path.to_string()));
        }
        parent.modified = now_ts();

        Ok(())
    }

    /// Move an entry to a new parent directory
    pub fn move_entry(&mut self, source_path: &str, dest_dir_path: &str) -> Result<()> {
        let src_parts = Self::split_path(source_path);
        if src_parts.is_empty() {
            return Err(VaultError::PathNotFound("/".to_string()));
        }

        let (entry_name, src_parent_parts) = src_parts.split_last().unwrap();
        let src_parent_path = if src_parent_parts.is_empty() {
            "/".to_string()
        } else {
            format!("/{}", src_parent_parts.join("/"))
        };

        // Cannot move into itself (for directories)
        let norm_dest = format!("{}/", dest_dir_path.trim_end_matches('/'));
        let norm_src = format!("{}/", source_path.trim_end_matches('/'));
        if norm_dest.starts_with(&norm_src) {
            return Err(VaultError::PathAlreadyExists(
                "Cannot move a directory into itself".to_string(),
            ));
        }

        // Same parent — no-op
        let norm_src_parent = src_parent_path.trim_end_matches('/');
        let norm_dest_dir = dest_dir_path.trim_end_matches('/');
        if norm_src_parent == norm_dest_dir || (norm_src_parent.is_empty() && (norm_dest_dir == "/" || norm_dest_dir.is_empty())) {
            return Ok(());
        }

        // Remove from source parent
        let src_parent = self.get_directory_mut(&src_parent_path)?;
        let entry = src_parent
            .entries
            .remove(*entry_name)
            .ok_or_else(|| VaultError::PathNotFound(source_path.to_string()))?;
        src_parent.modified = now_ts();

        let name = match &entry {
            VfsEntry::File(f) => f.name.clone(),
            VfsEntry::Directory(d) => d.name.clone(),
        };

        // Insert into destination directory
        let dest_dir = self.get_directory_mut(dest_dir_path)?;

        if dest_dir.entries.contains_key(&name) {
            // Put it back if dest has a conflict
            let src_parent = self.get_directory_mut(&src_parent_path)?;
            src_parent.entries.insert(name.clone(), entry);
            return Err(VaultError::PathAlreadyExists(format!(
                "{}/{}",
                dest_dir_path.trim_end_matches('/'),
                name
            )));
        }

        dest_dir.entries.insert(name, entry);
        dest_dir.modified = now_ts();

        Ok(())
    }

    /// Rename an entry
    pub fn rename_entry(&mut self, old_path: &str, new_name: &str) -> Result<()> {
        let parts = Self::split_path(old_path);
        if parts.is_empty() {
            return Err(VaultError::PathNotFound("/".to_string()));
        }

        let (old_name, parent_parts) = parts.split_last().unwrap();
        let parent_path = if parent_parts.is_empty() {
            "/".to_string()
        } else {
            format!("/{}", parent_parts.join("/"))
        };

        let parent = self.get_directory_mut(&parent_path)?;

        if new_name != *old_name && parent.entries.contains_key(new_name) {
            return Err(VaultError::PathAlreadyExists(format!(
                "{}/{}",
                parent_path.trim_end_matches('/'),
                new_name
            )));
        }

        let mut entry = parent
            .entries
            .remove(*old_name)
            .ok_or_else(|| VaultError::PathNotFound(old_path.to_string()))?;

        // Update the name inside the entry
        match &mut entry {
            VfsEntry::File(f) => f.name = new_name.to_string(),
            VfsEntry::Directory(d) => d.name = new_name.to_string(),
        }

        parent.entries.insert(new_name.to_string(), entry);
        parent.modified = now_ts();

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_and_read_file() {
        let mut vfs = VirtualFS::new();
        vfs.create_file("/hello.txt", b"Hello, World!".to_vec())
            .unwrap();

        let file = vfs.get_file("/hello.txt").unwrap();
        assert_eq!(file.content, b"Hello, World!");
        assert_eq!(file.name, "hello.txt");
    }

    #[test]
    fn test_nested_directories() {
        let mut vfs = VirtualFS::new();
        vfs.create_directory("/docs").unwrap();
        vfs.create_directory("/docs/private").unwrap();
        vfs.create_file("/docs/private/secret.txt", b"secret".to_vec())
            .unwrap();

        let file = vfs.get_file("/docs/private/secret.txt").unwrap();
        assert_eq!(file.content, b"secret");

        let entries = vfs.list_directory("/docs").unwrap();
        assert_eq!(entries.len(), 1);
        assert!(entries[0].is_directory);
        assert_eq!(entries[0].name, "private");
    }

    #[test]
    fn test_write_existing_file() {
        let mut vfs = VirtualFS::new();
        vfs.create_file("/test.txt", b"original".to_vec()).unwrap();
        vfs.write_file("/test.txt", b"updated".to_vec()).unwrap();

        let file = vfs.get_file("/test.txt").unwrap();
        assert_eq!(file.content, b"updated");
    }

    #[test]
    fn test_delete_entry() {
        let mut vfs = VirtualFS::new();
        vfs.create_file("/delete-me.txt", b"bye".to_vec())
            .unwrap();
        assert!(vfs.get_file("/delete-me.txt").is_ok());

        vfs.delete_entry("/delete-me.txt").unwrap();
        assert!(vfs.get_file("/delete-me.txt").is_err());
    }

    #[test]
    fn test_rename_entry() {
        let mut vfs = VirtualFS::new();
        vfs.create_file("/old.txt", b"content".to_vec()).unwrap();
        vfs.rename_entry("/old.txt", "new.txt").unwrap();

        assert!(vfs.get_file("/old.txt").is_err());
        let file = vfs.get_file("/new.txt").unwrap();
        assert_eq!(file.content, b"content");
        assert_eq!(file.name, "new.txt");
    }

    #[test]
    fn test_list_root() {
        let mut vfs = VirtualFS::new();
        vfs.create_file("/a.txt", b"a".to_vec()).unwrap();
        vfs.create_directory("/folder").unwrap();
        vfs.create_file("/b.txt", b"b".to_vec()).unwrap();

        let entries = vfs.list_directory("/").unwrap();
        assert_eq!(entries.len(), 3);
        // BTreeMap keeps sorted order
        assert_eq!(entries[0].name, "a.txt");
        assert!(!entries[0].is_directory);
        assert_eq!(entries[1].name, "b.txt");
        assert_eq!(entries[2].name, "folder");
        assert!(entries[2].is_directory);
    }
}
