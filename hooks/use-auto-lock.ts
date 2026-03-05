"use client";

import { useEffect, useCallback } from "react";
import { vaultApi } from "@/hooks/use-vault";
import { useVaultStore } from "@/store/vault-store";
import { useEditorStore } from "@/store/editor-store";
import { useFileTreeStore } from "@/store/file-tree-store";
import { useSettingsStore } from "@/store/settings-store";

export function useAutoLock() {
  const lock = useVaultStore((s) => s.lock);
  const closeAllTabs = useEditorStore((s) => s.closeAllTabs);
  const resetTree = useFileTreeStore((s) => s.reset);
  const autoLockEnabled = useSettingsStore((s) => s.autoLockEnabled);
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);

  const handleLock = useCallback(async () => {
    try {
      await vaultApi.lockVault();
    } catch {
      // ignore
    }
    closeAllTabs();
    resetTree();
    lock();
  }, [closeAllTabs, resetTree, lock]);

  useEffect(() => {
    if (!autoLockEnabled) return;

    const timeout = autoLockMinutes * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleLock, timeout);
    };

    const events = [
      "mousemove",
      "keydown",
      "mousedown",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [handleLock, autoLockEnabled, autoLockMinutes]);
}
