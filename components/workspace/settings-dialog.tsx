"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSettingsStore,
  ENCRYPTION_PRESETS,
  type EncryptionPreset,
} from "@/store/settings-store";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const autoLockEnabled = useSettingsStore((s) => s.autoLockEnabled);
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const defaultEncryptionPreset = useSettingsStore(
    (s) => s.defaultEncryptionPreset
  );
  const setAutoLockEnabled = useSettingsStore((s) => s.setAutoLockEnabled);
  const setAutoLockMinutes = useSettingsStore((s) => s.setAutoLockMinutes);
  const setDefaultEncryptionPreset = useSettingsStore(
    (s) => s.setDefaultEncryptionPreset
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Auto-lock section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-lock">Auto-lock</Label>
                <p className="text-xs text-muted-foreground">
                  Lock vault after inactivity
                </p>
              </div>
              <Switch
                id="auto-lock"
                checked={autoLockEnabled}
                onCheckedChange={setAutoLockEnabled}
              />
            </div>

            {autoLockEnabled && (
              <div className="space-y-2 pl-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Timeout
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {autoLockMinutes} min
                  </span>
                </div>
                <Slider
                  value={[autoLockMinutes]}
                  onValueChange={([v]) => setAutoLockMinutes(v)}
                  min={1}
                  max={60}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Encryption preset section */}
          <div className="space-y-2">
            <Label>Default encryption preset</Label>
            <Select
              value={defaultEncryptionPreset}
              onValueChange={(v) =>
                setDefaultEncryptionPreset(v as EncryptionPreset)
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
                    <div className="flex flex-col">
                      <span>{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used when creating new vaults. Existing vaults keep their preset.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
