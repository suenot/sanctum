import { invoke } from "@tauri-apps/api/core";

export interface FileInfo {
  name: string;
  path: string;
  is_directory: boolean;
  size: number;
  created: number;
  modified: number;
}

export type FileContent =
  | { type: "Text"; content: string }
  | { type: "Binary"; data: string; mime_type: string };

export const vaultApi = {
  createVault: (path: string, password: string, preset?: string) =>
    invoke<void>("create_vault", { path, password, preset: preset ?? null }),

  unlockVault: (path: string, password: string) =>
    invoke<void>("unlock_vault", { path, password }),

  unlockVaultBiometric: (path: string) =>
    invoke<void>("unlock_vault_biometric", { path }),

  lockVault: () => invoke<void>("lock_vault"),

  saveVault: () => invoke<void>("save_vault"),

  getVaultPath: () => invoke<string | null>("get_vault_path"),

  listFiles: (path: string) =>
    invoke<FileInfo[]>("list_files", { path }),

  readFile: (path: string) =>
    invoke<FileContent>("read_file", { path }),

  writeFile: (path: string, content: string, isBase64: boolean = false) =>
    invoke<void>("write_file", { path, content, isBase64 }),

  createFile: (path: string) => invoke<void>("create_file", { path }),

  createDirectory: (path: string) =>
    invoke<void>("create_directory", { path }),

  deleteEntry: (path: string) => invoke<void>("delete_entry", { path }),

  renameEntry: (oldPath: string, newName: string) =>
    invoke<void>("rename_entry", { oldPath, newName }),

  moveEntry: (sourcePath: string, destDirPath: string) =>
    invoke<void>("move_entry", { sourcePath, destDirPath }),

  hasBiometric: () => invoke<boolean>("has_biometric"),

  hasBiometricHardware: () => invoke<boolean>("has_biometric_hardware"),

  setupBiometric: () => invoke<void>("setup_biometric"),

  checkBiometricForPath: (path: string) =>
    invoke<boolean>("check_biometric_for_path", { path }),
};
