"use client";

import { useEffect, useCallback } from "react";
import { vaultApi } from "@/hooks/use-vault";
import { useVaultStore } from "@/store/vault-store";
import { useEditorStore } from "@/store/editor-store";
import { useFileTreeStore } from "@/store/file-tree-store";

const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function useAutoLock() {
  const lock = useVaultStore((s) => s.lock);
  const closeAllTabs = useEditorStore((s) => s.closeAllTabs);
  const resetTree = useFileTreeStore((s) => s.reset);

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
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleLock, AUTO_LOCK_TIMEOUT);
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
  }, [handleLock]);
}
