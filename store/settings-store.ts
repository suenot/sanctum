import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EncryptionPreset = "fast" | "standard" | "paranoid";

export const ENCRYPTION_PRESETS: Record<
  EncryptionPreset,
  { label: string; description: string }
> = {
  fast: {
    label: "Fast",
    description: "Argon2id: 16 MB, 1 iteration. Quick unlock, lighter protection.",
  },
  standard: {
    label: "Standard",
    description: "Argon2id: 64 MB, 3 iterations. Balanced speed and security.",
  },
  paranoid: {
    label: "Paranoid",
    description: "Argon2id: 256 MB, 8 iterations. Maximum protection, slower unlock.",
  },
};

interface SettingsState {
  autoLockEnabled: boolean;
  autoLockMinutes: number;
  defaultEncryptionPreset: EncryptionPreset;

  setAutoLockEnabled: (enabled: boolean) => void;
  setAutoLockMinutes: (minutes: number) => void;
  setDefaultEncryptionPreset: (preset: EncryptionPreset) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoLockEnabled: true,
      autoLockMinutes: 5,
      defaultEncryptionPreset: "standard",

      setAutoLockEnabled: (enabled) => set({ autoLockEnabled: enabled }),
      setAutoLockMinutes: (minutes) =>
        set({ autoLockMinutes: Math.max(1, Math.min(60, minutes)) }),
      setDefaultEncryptionPreset: (preset) =>
        set({ defaultEncryptionPreset: preset }),
    }),
    { name: "sanctum-settings" }
  )
);
