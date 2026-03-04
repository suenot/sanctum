"use client";

import { useEditorStore } from "@/store/editor-store";
import { EditorTabs } from "./editor-tabs";
import { MonacoWrapper } from "./monaco-wrapper";
import { ImageViewer } from "./image-viewer";
import { HexViewer } from "./hex-viewer";
import { Shield, FileText } from "lucide-react";

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
      <Shield className="h-16 w-16 opacity-20" />
      <div className="text-center space-y-1">
        <p className="text-lg font-medium text-foreground/50">Secret Vault</p>
        <p className="text-sm">Open a file from the explorer to start editing</p>
      </div>
      <div className="text-xs space-y-1 text-center opacity-60">
        <p>Cmd+S to save</p>
        <p>Cmd+W to close tab</p>
      </div>
    </div>
  );
}

export function EditorArea() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabPath = useEditorStore((s) => s.activeTabPath);

  const activeTab = tabs.find((t) => t.path === activeTabPath);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <EditorTabs />

      <div className="flex-1 min-h-0">
        {!activeTab ? (
          <WelcomeScreen />
        ) : !activeTab.content ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="animate-pulse">Loading...</div>
          </div>
        ) : activeTab.content.type === "Text" ? (
          <MonacoWrapper
            key={activeTab.path}
            path={activeTab.path}
            content={activeTab.content.content}
          />
        ) : activeTab.content.mime_type.startsWith("image/") ? (
          <ImageViewer
            data={activeTab.content.data}
            mimeType={activeTab.content.mime_type}
            filename={activeTab.name}
          />
        ) : (
          <HexViewer
            data={activeTab.content.data}
            filename={activeTab.name}
          />
        )}
      </div>
    </div>
  );
}
