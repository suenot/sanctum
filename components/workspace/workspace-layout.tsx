"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { FileTree } from "./sidebar/file-tree";
import { EditorArea } from "./editor/editor-area";
import { StatusBar } from "./status-bar/status-bar";
import { useFileTreeStore } from "@/store/file-tree-store";
import { useVaultStore } from "@/store/vault-store";
import { useEditorStore } from "@/store/editor-store";
import { useAutoLock } from "@/hooks/use-auto-lock";
import { vaultApi } from "@/hooks/use-vault";
import { Lock, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SettingsDialog } from "./settings-dialog";

function DragHandle({
  onDragStart,
  onDrag,
}: {
  onDragStart?: () => void;
  onDrag: (deltaX: number) => void;
}) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onDragStart?.();
      const startX = e.clientX;

      const onMouseMove = (ev: MouseEvent) => {
        onDrag(ev.clientX - startX);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [onDrag, onDragStart]
  );

  return (
    <div
      className="w-1 shrink-0 bg-border/50 hover:bg-primary/40 transition-colors cursor-col-resize relative group"
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

export function WorkspaceLayout() {
  const loadRoot = useFileTreeStore((s) => s.loadRoot);
  const resetTree = useFileTreeStore((s) => s.reset);
  const closeAllTabs = useEditorStore((s) => s.closeAllTabs);
  const lock = useVaultStore((s) => s.lock);

  const [sidebarWidth, setSidebarWidth] = useState(250);
  const baseWidthRef = useRef(250);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useAutoLock();

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  const handleLock = useCallback(async () => {
    try {
      await vaultApi.lockVault();
    } catch (e) {
      console.error("Lock failed:", e);
    }
    closeAllTabs();
    resetTree();
    lock();
  }, [closeAllTabs, resetTree, lock]);

  const handleSetupBiometric = useCallback(async () => {
    try {
      await vaultApi.setupBiometric();
      toast.success("Touch ID enabled for this vault");
    } catch (e) {
      toast.error(`Touch ID setup failed: ${e}`);
      console.error("Biometric setup failed:", e);
    }
  }, []);

  const handleDrag = useCallback((deltaX: number) => {
    setSidebarWidth((prev) => {
      if (deltaX === 0) {
        baseWidthRef.current = prev;
        return prev;
      }
      const newWidth = baseWidthRef.current + deltaX;
      return Math.max(180, Math.min(500, newWidth));
    });
  }, []);

  const handleDragStart = useCallback(() => {
    baseWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4 text-primary" />
          <span>Sanctum</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleSetupBiometric}
          >
            Enable Touch ID
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleLock}
          >
            <Lock className="h-3 w-3 mr-1" />
            Lock
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <div
          className="shrink-0 overflow-hidden"
          style={{ width: sidebarWidth }}
        >
          <FileTree />
        </div>
        <DragHandle onDragStart={handleDragStart} onDrag={handleDrag} />
        <div className="flex-1 min-w-0">
          <EditorArea />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
