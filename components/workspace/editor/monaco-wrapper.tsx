"use client";

import { useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { getLanguageFromExtension } from "@/lib/file-icons";
import { vaultApi } from "@/hooks/use-vault";
import { useEditorStore } from "@/store/editor-store";
import { useFileTreeStore } from "@/store/file-tree-store";
import type { OnMount, OnChange } from "@monaco-editor/react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface MonacoWrapperProps {
  path: string;
  content: string;
}

export function MonacoWrapper({ path, content }: MonacoWrapperProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const updateContent = useEditorStore((s) => s.updateContent);
  const tabs = useEditorStore((s) => s.tabs);
  const refresh = useFileTreeStore((s) => s.refresh);

  const filename = path.split("/").pop() || "";
  const language = getLanguageFromExtension(filename);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Add Cmd+S / Ctrl+S save shortcut
      editor.addAction({
        id: "save-file",
        label: "Save File",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: async () => {
          const value = editor.getValue();
          try {
            await vaultApi.writeFile(path, value, false);
            // Mark as not dirty
            const tab = useEditorStore.getState().tabs.find((t) => t.path === path);
            if (tab) {
              useEditorStore.setState({
                tabs: useEditorStore.getState().tabs.map((t) =>
                  t.path === path
                    ? {
                        ...t,
                        isDirty: false,
                        originalContent: value,
                        content: { type: "Text" as const, content: value },
                      }
                    : t
                ),
              });
            }
            await refresh();
          } catch (e) {
            console.error("Save failed:", e);
          }
        },
      });

      editor.focus();
    },
    [path, refresh]
  );

  const handleChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined) {
        updateContent(path, value);
      }
    },
    [path, updateContent]
  );

  return (
    <Editor
      height="100%"
      language={language}
      value={content}
      theme="vs-dark"
      onMount={handleMount}
      onChange={handleChange}
      options={{
        minimap: { enabled: true },
        fontSize: 13,
        lineNumbers: "on",
        wordWrap: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        renderWhitespace: "selection",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        padding: { top: 8 },
      }}
    />
  );
}
