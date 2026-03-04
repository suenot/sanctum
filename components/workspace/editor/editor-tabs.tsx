"use client";

import { useEditorStore } from "@/store/editor-store";
import { getFileIcon } from "@/lib/file-icons";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function EditorTabs() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabPath = useEditorStore((s) => s.activeTabPath);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        const Icon = getFileIcon(tab.name, false);

        return (
          <div
            key={tab.path}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer border-r border-border min-w-0 shrink-0 group",
              isActive
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:bg-accent/30"
            )}
            onClick={() => setActiveTab(tab.path)}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-32">{tab.name}</span>
            {tab.isDirty && (
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            )}
            <button
              className="ml-1 p-0.5 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.path);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
