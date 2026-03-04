"use client";

import { useEditorStore } from "@/store/editor-store";
import { useVaultStore } from "@/store/vault-store";
import { getLanguageFromExtension } from "@/lib/file-icons";
import { Lock, FileText } from "lucide-react";

export function StatusBar() {
  const activeTabPath = useEditorStore((s) => s.activeTabPath);
  const tabs = useEditorStore((s) => s.tabs);
  const vaultPath = useVaultStore((s) => s.vaultPath);

  const activeTab = tabs.find((t) => t.path === activeTabPath);
  const vaultName = vaultPath?.split("/").pop() || "Vault";

  const language = activeTab
    ? getLanguageFromExtension(activeTab.name)
    : "";

  const fileSize = activeTab?.content
    ? activeTab.content.type === "Text"
      ? `${new Blob([activeTab.content.content]).size} B`
      : `${Math.ceil((activeTab.content.data.length * 3) / 4)} B`
    : "";

  return (
    <div className="flex items-center justify-between h-6 px-3 border-t border-border bg-primary/10 text-xs text-muted-foreground shrink-0 select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          <span>{vaultName}</span>
        </div>
        {activeTab && (
          <>
            <span>{activeTab.path}</span>
            {activeTab.isDirty && <span className="text-primary">Modified</span>}
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {activeTab && (
          <>
            {fileSize && <span>{fileSize}</span>}
            {language && <span className="capitalize">{language}</span>}
            <span>UTF-8</span>
          </>
        )}
        <span>AES-256-GCM</span>
      </div>
    </div>
  );
}
