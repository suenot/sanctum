"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/editor-store";
import { EditorTabs } from "./editor-tabs";
import { MonacoWrapper } from "./monaco-wrapper";
import { ImageViewer } from "./image-viewer";
import { HexViewer } from "./hex-viewer";
import { MarkdownPreview } from "./markdown-preview";
import { Shield, BookOpen, Code } from "lucide-react";
import { Button } from "@/components/ui/button";

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
      <Shield className="h-16 w-16 opacity-20" />
      <div className="text-center space-y-1">
        <p className="text-lg font-medium text-foreground/50">Sanctum</p>
        <p className="text-sm">Open a file from the explorer to start editing</p>
      </div>
      <div className="text-xs space-y-1 text-center opacity-60">
        <p>Cmd+S to save</p>
        <p>Cmd+W to close tab</p>
      </div>
    </div>
  );
}

type PreviewMode = "editor" | "preview" | "split";

export function EditorArea() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabPath = useEditorStore((s) => s.activeTabPath);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("editor");

  const activeTab = tabs.find((t) => t.path === activeTabPath);
  const isMarkdown =
    activeTab?.path.endsWith(".md") || activeTab?.path.endsWith(".markdown");
  const isText = activeTab?.content?.type === "Text";

  const renderContent = () => {
    if (!activeTab) return <WelcomeScreen />;
    if (!activeTab.content) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="animate-pulse">Loading...</div>
        </div>
      );
    }

    if (activeTab.content.type === "Text") {
      if (isMarkdown) {
        if (previewMode === "preview") {
          return <MarkdownPreview content={activeTab.content.content} />;
        }
        if (previewMode === "split") {
          return (
            <div className="flex h-full">
              <div className="flex-1 min-w-0 border-r border-border/30">
                <MonacoWrapper
                  key={activeTab.path}
                  path={activeTab.path}
                  content={activeTab.content.content}
                />
              </div>
              <div className="flex-1 min-w-0">
                <MarkdownPreview content={activeTab.content.content} />
              </div>
            </div>
          );
        }
      }
      return (
        <MonacoWrapper
          key={activeTab.path}
          path={activeTab.path}
          content={activeTab.content.content}
        />
      );
    }

    if (activeTab.content.mime_type.startsWith("image/")) {
      return (
        <ImageViewer
          data={activeTab.content.data}
          mimeType={activeTab.content.mime_type}
          filename={activeTab.name}
        />
      );
    }

    return (
      <HexViewer data={activeTab.content.data} filename={activeTab.name} />
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <EditorTabs />
        </div>
        {isMarkdown && isText && (
          <div className="flex items-center gap-0.5 px-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 ${previewMode === "editor" ? "bg-muted" : ""}`}
              onClick={() => setPreviewMode("editor")}
              title="Source code"
            >
              <Code className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 ${previewMode === "split" ? "bg-muted" : ""}`}
              onClick={() => setPreviewMode("split")}
              title="Split view"
            >
              <div className="flex h-3.5 w-3.5 items-center gap-px">
                <Code className="h-3 w-1.5" />
                <BookOpen className="h-3 w-1.5" />
              </div>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 ${previewMode === "preview" ? "bg-muted" : ""}`}
              onClick={() => setPreviewMode("preview")}
              title="Preview"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">{renderContent()}</div>
    </div>
  );
}
