import { create } from "zustand";

interface VaultState {
  status: "locked" | "unlocking" | "unlocked";
  vaultPath: string | null;
  error: string | null;

  setStatus: (status: VaultState["status"]) => void;
  setVaultPath: (path: string | null) => void;
  setError: (error: string | null) => void;
  unlock: (path: string) => void;
  lock: () => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  status: "locked",
  vaultPath: null,
  error: null,

  setStatus: (status) => set({ status, error: null }),
  setVaultPath: (vaultPath) => set({ vaultPath }),
  setError: (error) => set({ error, status: "locked" }),
  unlock: (path) => set({ status: "unlocked", vaultPath: path, error: null }),
  lock: () => set({ status: "locked", vaultPath: null, error: null }),
}));
