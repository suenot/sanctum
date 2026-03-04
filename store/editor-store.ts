import { create } from "zustand";
import { FileContent, vaultApi } from "@/hooks/use-vault";

export interface OpenTab {
  path: string;
  name: string;
  content: FileContent | null;
  isDirty: boolean;
  originalContent: string;
}

interface EditorState {
  tabs: OpenTab[];
  activeTabPath: string | null;

  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  saveActiveFile: () => Promise<void>;
  closeAllTabs: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabPath: null,

  openFile: async (path: string) => {
    const { tabs } = get();
    // If already open, just activate
    const existing = tabs.find((t) => t.path === path);
    if (existing) {
      set({ activeTabPath: path });
      return;
    }

    // Load content from vault
    const content = await vaultApi.readFile(path);
    const name = path.split("/").pop() || path;
    const originalContent =
      content.type === "Text" ? content.content : "";

    set({
      tabs: [
        ...tabs,
        { path, name, content, isDirty: false, originalContent },
      ],
      activeTabPath: path,
    });
  },

  closeTab: (path: string) => {
    const { tabs, activeTabPath } = get();
    const newTabs = tabs.filter((t) => t.path !== path);
    let newActive = activeTabPath;

    if (activeTabPath === path) {
      const idx = tabs.findIndex((t) => t.path === path);
      if (newTabs.length > 0) {
        newActive = newTabs[Math.min(idx, newTabs.length - 1)].path;
      } else {
        newActive = null;
      }
    }

    set({ tabs: newTabs, activeTabPath: newActive });
  },

  setActiveTab: (path: string) => {
    set({ activeTabPath: path });
  },

  updateContent: (path: string, content: string) => {
    set({
      tabs: get().tabs.map((t) =>
        t.path === path
          ? { ...t, isDirty: content !== t.originalContent }
          : t
      ),
    });
  },

  saveFile: async (path: string) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.path === path);
    if (!tab || !tab.content || tab.content.type !== "Text") return;

    // We need to get the current content from the editor
    // The content in tab.content may be stale, but originalContent tracks changes via isDirty
    // For save, we read from a separate mechanism (Monaco's getValue)
    // This is handled by the MonacoWrapper calling writeFile directly
  },

  saveActiveFile: async () => {
    const { activeTabPath, saveFile } = get();
    if (activeTabPath) {
      await saveFile(activeTabPath);
    }
  },

  closeAllTabs: () => {
    set({ tabs: [], activeTabPath: null });
  },
}));
