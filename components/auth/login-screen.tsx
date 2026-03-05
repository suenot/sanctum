"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Plus, FolderOpen, Fingerprint, Shield } from "lucide-react";
import { vaultApi } from "@/hooks/use-vault";
import { useVaultStore } from "@/store/vault-store";
import {
  useSettingsStore,
  ENCRYPTION_PRESETS,
  type EncryptionPreset,
} from "@/store/settings-store";

export function LoginScreen() {
  const [password, setPassword] = useState("");
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const defaultPreset = useSettingsStore((s) => s.defaultEncryptionPreset);
  const [selectedPreset, setSelectedPreset] =
    useState<EncryptionPreset>(defaultPreset);

  const { setStatus, setError, error, unlock } = useVaultStore();

  useEffect(() => {
    vaultApi.hasBiometricHardware().then(setHasBiometric).catch(() => {});
  }, []);

  useEffect(() => {
    if (vaultPath) {
      vaultApi
        .checkBiometricForPath(vaultPath)
        .then(setHasBiometric)
        .catch(() => {});
    }
  }, [vaultPath]);

  const handleOpenVault = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "Vault", extensions: ["vault"] }],
      });
      if (selected) {
        setVaultPath(selected as string);
        setError(null);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const handleUnlock = async () => {
    if (!vaultPath || !password) return;
    setIsLoading(true);
    setStatus("unlocking");
    try {
      await vaultApi.unlockVault(vaultPath, password);
      unlock(vaultPath);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
      setPassword("");
    }
  };

  const handleBiometricUnlock = async () => {
    if (!vaultPath) return;
    setIsLoading(true);
    setStatus("unlocking");
    try {
      await vaultApi.unlockVaultBiometric(vaultPath);
      unlock(vaultPath);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVault = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const selected = await save({
        filters: [{ name: "Vault", extensions: ["vault"] }],
        defaultPath: "secrets.vault",
      });
      if (!selected) return;

      setIsLoading(true);
      setStatus("unlocking");
      await vaultApi.createVault(selected, newPassword, selectedPreset);
      setCreateDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      unlock(selected);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="p-4 rounded-full bg-primary/10">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Sanctum</h1>
          <p className="text-sm text-muted-foreground text-center">
            Encrypted storage for your private files
          </p>
        </div>

        {vaultPath ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted text-sm font-mono truncate">
              {vaultPath.split("/").pop()}
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                autoFocus
                disabled={isLoading}
              />
              <Button
                className="w-full"
                onClick={handleUnlock}
                disabled={isLoading || !password}
              >
                <Lock className="mr-2 h-4 w-4" />
                {isLoading ? "Unlocking..." : "Unlock"}
              </Button>
            </div>

            {hasBiometric && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleBiometricUnlock}
                disabled={isLoading}
              >
                <Fingerprint className="mr-2 h-4 w-4" />
                Unlock with Touch ID
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setVaultPath(null);
                setError(null);
              }}
            >
              Choose different vault
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button className="w-full" onClick={handleOpenVault}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Open Vault
            </Button>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Vault
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Vault</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateVault()}
                  />
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Encryption strength
                    </label>
                    <Select
                      value={selectedPreset}
                      onValueChange={(v) =>
                        setSelectedPreset(v as EncryptionPreset)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(ENCRYPTION_PRESETS) as [
                            EncryptionPreset,
                            { label: string; description: string },
                          ][]
                        ).map(([key, { label, description }]) => (
                          <SelectItem key={key} value={key}>
                            <span>{label}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {description}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreateVault}
                    disabled={isLoading || !newPassword || !confirmPassword}
                  >
                    {isLoading ? "Creating..." : "Create Vault"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
