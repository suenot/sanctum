import { create } from "zustand";
import { FileInfo, vaultApi } from "@/hooks/use-vault";

export interface TreeNode extends FileInfo {
  children?: TreeNode[];
  isLoaded?: boolean;
}

interface FileTreeState {
  tree: TreeNode[];
  expandedPaths: Set<string>;
  selectedPaths: Set<string>;
  focusedPath: string | null;
  lastClickedPath: string | null;
  isLoading: boolean;

  loadRoot: () => Promise<void>;
  loadDirectory: (path: string) => Promise<void>;
  toggleExpanded: (path: string) => Promise<void>;
  setFocused: (path: string | null) => void;
  selectSingle: (path: string) => void;
  selectRange: (path: string) => void;
  selectToggle: (path: string) => void;
  clearSelection: () => void;
  refresh: () => Promise<void>;
  reset: () => void;
  getFlatNodes: () => TreeNode[];
}

function updateNodeChildren(
  nodes: TreeNode[],
  targetPath: string,
  children: TreeNode[]
): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, children, isLoaded: true };
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeChildren(node.children, targetPath, children),
      };
    }
    return node;
  });
}

function flattenTree(nodes: TreeNode[], expandedPaths: Set<string>): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.is_directory && expandedPaths.has(node.path) && node.children) {
      result.push(...flattenTree(node.children, expandedPaths));
    }
  }
  return result;
}

export const useFileTreeStore = create<FileTreeState>((set, get) => ({
  tree: [],
  expandedPaths: new Set(),
  selectedPaths: new Set(),
  focusedPath: null,
  lastClickedPath: null,
  isLoading: false,

  loadRoot: async () => {
    set({ isLoading: true });
    try {
      const files = await vaultApi.listFiles("/");
      const tree: TreeNode[] = files.map((f) => ({
        ...f,
        children: f.is_directory ? [] : undefined,
        isLoaded: false,
      }));
      set({ tree, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadDirectory: async (path: string) => {
    try {
      const files = await vaultApi.listFiles(path);
      const children: TreeNode[] = files.map((f) => ({
        ...f,
        children: f.is_directory ? [] : undefined,
        isLoaded: false,
      }));
      set({ tree: updateNodeChildren(get().tree, path, children) });
    } catch {
      // ignore
    }
  },

  toggleExpanded: async (path: string) => {
    const { expandedPaths, loadDirectory } = get();
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      await loadDirectory(path);
    }
    set({ expandedPaths: newExpanded });
  },

  setFocused: (path) => {
    set({ focusedPath: path });
  },

  selectSingle: (path) => {
    set({
      selectedPaths: new Set([path]),
      focusedPath: path,
      lastClickedPath: path,
    });
  },

  selectRange: (path) => {
    const { lastClickedPath } = get();
    if (!lastClickedPath) {
      set({
        selectedPaths: new Set([path]),
        focusedPath: path,
        lastClickedPath: path,
      });
      return;
    }
    const flat = get().getFlatNodes();
    const startIdx = flat.findIndex((n) => n.path === lastClickedPath);
    const endIdx = flat.findIndex((n) => n.path === path);
    if (startIdx === -1 || endIdx === -1) {
      set({
        selectedPaths: new Set([path]),
        focusedPath: path,
        lastClickedPath: path,
      });
      return;
    }
    const from = Math.min(startIdx, endIdx);
    const to = Math.max(startIdx, endIdx);
    const newSelected = new Set<string>();
    for (let i = from; i <= to; i++) {
      newSelected.add(flat[i].path);
    }
    set({ selectedPaths: newSelected, focusedPath: path });
  },

  selectToggle: (path) => {
    const { selectedPaths } = get();
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    set({
      selectedPaths: newSelected,
      focusedPath: path,
      lastClickedPath: path,
    });
  },

  clearSelection: () => {
    set({ selectedPaths: new Set(), focusedPath: null, lastClickedPath: null });
  },

  refresh: async () => {
    const { loadRoot, expandedPaths, loadDirectory } = get();
    await loadRoot();
    for (const path of expandedPaths) {
      await loadDirectory(path);
    }
  },

  reset: () => {
    set({
      tree: [],
      expandedPaths: new Set(),
      selectedPaths: new Set(),
      focusedPath: null,
      lastClickedPath: null,
      isLoading: false,
    });
  },

  getFlatNodes: () => {
    const { tree, expandedPaths } = get();
    return flattenTree(tree, expandedPaths);
  },
}));
