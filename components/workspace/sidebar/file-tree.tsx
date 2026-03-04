"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  FilePlus,
  FolderPlus,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
} from "lucide-react";
import { useFileTreeStore, TreeNode } from "@/store/file-tree-store";
import { useEditorStore } from "@/store/editor-store";
import { vaultApi } from "@/hooks/use-vault";
import { getFileIcon } from "@/lib/file-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Drag state (module-level, shared across tree) ──
interface DragState {
  active: boolean;
  sourcePaths: string[];
  sourceLabel: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  dropTargetPath: string | null;
  didMove: boolean;
}

const DRAG_THRESHOLD = 5;

function getDropDirForElement(el: Element | null): string | null {
  while (el) {
    const path = el.getAttribute("data-path");
    const isDir = el.getAttribute("data-is-dir");
    if (path && isDir === "true") return path;
    if (path && isDir === "false") {
      // file → its parent dir
      const parts = path.split("/");
      parts.pop();
      return parts.join("/") || "/";
    }
    el = el.parentElement;
  }
  return "/"; // root fallback
}

// ── Floating drag indicator ──
function DragOverlay({
  label,
  x,
  y,
}: {
  label: string;
  x: number;
  y: number;
}) {
  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
      style={{ left: x + 12, top: y - 8 }}
    >
      {label}
    </div>,
    document.body
  );
}

// ── Single tree item ──
function FileTreeItem({
  node,
  depth,
  dropTargetPath,
  onDragMouseDown,
}: {
  node: TreeNode;
  depth: number;
  dropTargetPath: string | null;
  onDragMouseDown: (e: React.MouseEvent, node: TreeNode) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [isCreating, setIsCreating] = useState<"file" | "folder" | null>(null);
  const [createName, setCreateName] = useState("");

  const expandedPaths = useFileTreeStore((s) => s.expandedPaths);
  const toggleExpanded = useFileTreeStore((s) => s.toggleExpanded);
  const selectedPaths = useFileTreeStore((s) => s.selectedPaths);
  const focusedPath = useFileTreeStore((s) => s.focusedPath);
  const selectSingle = useFileTreeStore((s) => s.selectSingle);
  const selectRange = useFileTreeStore((s) => s.selectRange);
  const selectToggle = useFileTreeStore((s) => s.selectToggle);
  const refresh = useFileTreeStore((s) => s.refresh);
  const openFile = useEditorStore((s) => s.openFile);

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPaths.has(node.path);
  const isFocused = focusedPath === node.path;
  const isDropTarget = dropTargetPath === node.path && node.is_directory;
  const Icon = getFileIcon(node.name, node.is_directory, isExpanded);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Modifier clicks are handled in onMouseDown for reliability in Tauri
      if (e.shiftKey || e.metaKey || e.ctrlKey) return;
      selectSingle(node.path);
      if (node.is_directory) {
        toggleExpanded(node.path);
      } else {
        openFile(node.path);
      }
    },
    [node, selectSingle, toggleExpanded, openFile]
  );

  const handleRename = async () => {
    if (renameValue && renameValue !== node.name) {
      try {
        await vaultApi.renameEntry(node.path, renameValue);
        await refresh();
      } catch (e) {
        toast.error(`Rename failed: ${e}`);
      }
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    try {
      await vaultApi.deleteEntry(node.path);
      await refresh();
    } catch (e) {
      toast.error(`Delete failed: ${e}`);
    }
  };

  const handleCreate = async () => {
    if (!createName) {
      setIsCreating(null);
      return;
    }
    const parentPath = node.is_directory
      ? node.path
      : node.path.split("/").slice(0, -1).join("/") || "/";
    const newPath = `${parentPath}/${createName}`;
    try {
      if (isCreating === "folder") {
        await vaultApi.createDirectory(newPath);
      } else {
        await vaultApi.createFile(newPath);
      }
      await refresh();
      if (node.is_directory && !isExpanded) {
        await toggleExpanded(node.path);
      }
    } catch (e) {
      toast.error(`Create failed: ${e}`);
    }
    setIsCreating(null);
    setCreateName("");
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left button, skip if renaming
      if (e.button !== 0 || isRenaming) return;

      // Handle modifier selection here (more reliable than onClick in Tauri webview)
      if (e.shiftKey) {
        e.preventDefault();
        selectRange(node.path);
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        selectToggle(node.path);
        return;
      }

      // Start potential drag for non-modifier clicks
      onDragMouseDown(e, node);
    },
    [node, isRenaming, onDragMouseDown, selectRange, selectToggle]
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 cursor-pointer text-sm hover:bg-accent/50 rounded-sm select-none",
              isSelected && "bg-accent text-accent-foreground",
              isFocused &&
                !isSelected &&
                "outline outline-1 outline-primary/50 -outline-offset-1",
              isDropTarget &&
                "bg-primary/20 outline outline-2 outline-primary -outline-offset-2"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            data-path={node.path}
            data-is-dir={node.is_directory ? "true" : "false"}
          >
            {node.is_directory ? (
              isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            {isRenaming ? (
              <Input
                className="h-5 text-xs px-1 py-0"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setIsRenaming(false);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              setIsCreating("file");
              if (node.is_directory && !isExpanded) {
                toggleExpanded(node.path);
              }
            }}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            New File
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              setIsCreating("folder");
              if (node.is_directory && !isExpanded) {
                toggleExpanded(node.path);
              }
            }}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => {
              setIsRenaming(true);
              setRenameValue(node.name);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem className="text-destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Inline creation input */}
      {isCreating && (
        <div
          className="flex items-center gap-1 px-2 py-0.5"
          style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
        >
          {isCreating === "folder" ? (
            <FolderPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <FilePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <Input
            className="h-5 text-xs px-1 py-0"
            placeholder={isCreating === "folder" ? "folder name" : "file name"}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsCreating(null);
                setCreateName("");
              }
            }}
            autoFocus
          />
        </div>
      )}

      {/* Children */}
      {node.is_directory && isExpanded && node.children && (
        <>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              dropTargetPath={dropTargetPath}
              onDragMouseDown={onDragMouseDown}
            />
          ))}
          {node.children.length === 0 && (
            <div
              className="text-xs text-muted-foreground px-2 py-0.5 italic"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              Empty folder
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Main FileTree with mouse-event drag & drop ──
export function FileTree() {
  const tree = useFileTreeStore((s) => s.tree);
  const refresh = useFileTreeStore((s) => s.refresh);
  const focusedPath = useFileTreeStore((s) => s.focusedPath);
  const selectedPaths = useFileTreeStore((s) => s.selectedPaths);
  const selectSingle = useFileTreeStore((s) => s.selectSingle);
  const selectRange = useFileTreeStore((s) => s.selectRange);
  const toggleExpanded = useFileTreeStore((s) => s.toggleExpanded);
  const expandedPaths = useFileTreeStore((s) => s.expandedPaths);
  const getFlatNodes = useFileTreeStore((s) => s.getFlatNodes);
  const openFile = useEditorStore((s) => s.openFile);

  const [isCreatingRoot, setIsCreatingRoot] = useState<
    "file" | "folder" | null
  >(null);
  const [createName, setCreateName] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  // Keep ref in sync with state (for event listeners)
  dragRef.current = drag;

  // ── Mouse-based drag & drop ──
  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent, node: TreeNode) => {
      if (e.button !== 0) return;

      const paths = selectedPaths.has(node.path)
        ? Array.from(selectedPaths)
        : [node.path];

      const label =
        paths.length > 1 ? `${paths.length} items` : node.name;

      const state: DragState = {
        active: false,
        sourcePaths: paths,
        sourceLabel: label,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        dropTargetPath: null,
        didMove: false,
      };

      dragRef.current = state;
      // Don't setDrag yet — wait for threshold
    },
    [selectedPaths]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (!d.active) {
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          d.active = true;
          d.didMove = true;
          document.body.style.cursor = "grabbing";
          document.body.style.userSelect = "none";
        } else {
          return;
        }
      }

      // Find drop target under cursor
      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      const dropDir = getDropDirForElement(elUnder);

      setDrag({
        ...d,
        currentX: e.clientX,
        currentY: e.clientY,
        dropTargetPath: dropDir,
      });
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;

      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (!d.active || !d.didMove) {
        setDrag(null);
        return;
      }

      const destDir = d.dropTargetPath || "/";
      setDrag(null);

      // Perform move
      for (const srcPath of d.sourcePaths) {
        if (srcPath === destDir) continue;
        if (destDir.startsWith(srcPath + "/")) continue;
        const srcParent = srcPath.split("/").slice(0, -1).join("/") || "/";
        if (srcParent === destDir) continue;
        try {
          await vaultApi.moveEntry(srcPath, destDir);
        } catch (err) {
          toast.error(`Move failed: ${err}`);
        }
      }

      await useFileTreeStore.getState().refresh();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleCreateRoot = async () => {
    if (!createName) {
      setIsCreatingRoot(null);
      return;
    }
    const newPath = `/${createName}`;
    try {
      if (isCreatingRoot === "folder") {
        await vaultApi.createDirectory(newPath);
      } else {
        await vaultApi.createFile(newPath);
      }
      await refresh();
    } catch (e) {
      toast.error(`Create failed: ${e}`);
    }
    setIsCreatingRoot(null);
    setCreateName("");
  };

  // ── Keyboard navigation (VSCode-like) ──
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      const flat = getFlatNodes();
      if (flat.length === 0) return;

      const currentIdx = flat.findIndex((n) => n.path === focusedPath);

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const nextIdx =
            currentIdx === -1 ? 0 : Math.min(currentIdx + 1, flat.length - 1);
          const nextNode = flat[nextIdx];
          if (e.shiftKey) {
            selectRange(nextNode.path);
          } else {
            selectSingle(nextNode.path);
          }
          containerRef.current
            ?.querySelector(`[data-path="${CSS.escape(nextNode.path)}"]`)
            ?.scrollIntoView({ block: "nearest" });
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prevIdx =
            currentIdx === -1 ? 0 : Math.max(currentIdx - 1, 0);
          const prevNode = flat[prevIdx];
          if (e.shiftKey) {
            selectRange(prevNode.path);
          } else {
            selectSingle(prevNode.path);
          }
          containerRef.current
            ?.querySelector(`[data-path="${CSS.escape(prevNode.path)}"]`)
            ?.scrollIntoView({ block: "nearest" });
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (currentIdx === -1) break;
          const node = flat[currentIdx];
          if (node.is_directory && !expandedPaths.has(node.path)) {
            await toggleExpanded(node.path);
          } else if (node.is_directory && expandedPaths.has(node.path)) {
            if (currentIdx + 1 < flat.length) {
              selectSingle(flat[currentIdx + 1].path);
            }
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (currentIdx === -1) break;
          const node = flat[currentIdx];
          if (node.is_directory && expandedPaths.has(node.path)) {
            await toggleExpanded(node.path);
          } else {
            const parentPath =
              node.path.split("/").slice(0, -1).join("/") || "/";
            const parentNode = flat.find((n) => n.path === parentPath);
            if (parentNode) {
              selectSingle(parentNode.path);
              containerRef.current
                ?.querySelector(
                  `[data-path="${CSS.escape(parentNode.path)}"]`
                )
                ?.scrollIntoView({ block: "nearest" });
            }
          }
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (currentIdx === -1) break;
          const node = flat[currentIdx];
          if (node.is_directory) {
            await toggleExpanded(node.path);
          } else {
            openFile(node.path);
          }
          break;
        }
        case " ": {
          e.preventDefault();
          if (currentIdx === -1) break;
          const node = flat[currentIdx];
          if (!node.is_directory) {
            openFile(node.path);
          }
          break;
        }
        case "Delete":
        case "Backspace": {
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            for (const path of selectedPaths) {
              try {
                await vaultApi.deleteEntry(path);
              } catch (err) {
                toast.error(`Delete failed: ${err}`);
              }
            }
            await refresh();
          }
          break;
        }
      }
    },
    [
      focusedPath,
      selectedPaths,
      expandedPaths,
      getFlatNodes,
      selectSingle,
      selectRange,
      toggleExpanded,
      openFile,
      refresh,
    ]
  );

  const dropTargetPath = drag?.active ? drag.dropTargetPath : null;

  return (
    <div className="flex flex-col h-full bg-muted/20 overflow-hidden min-w-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
          Explorer
        </span>
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsCreatingRoot("file")}
            title="New File"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsCreatingRoot("folder")}
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => refresh()}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div
          ref={containerRef}
          className="py-1 outline-none"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          data-path="/"
          data-is-dir="true"
        >
          {isCreatingRoot && (
            <div
              className="flex items-center gap-1 px-2 py-0.5"
              style={{ paddingLeft: "8px" }}
            >
              {isCreatingRoot === "folder" ? (
                <FolderPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <FilePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Input
                className="h-5 text-xs px-1 py-0"
                placeholder={
                  isCreatingRoot === "folder" ? "folder name" : "file name"
                }
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onBlur={handleCreateRoot}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateRoot();
                  if (e.key === "Escape") {
                    setIsCreatingRoot(null);
                    setCreateName("");
                  }
                }}
                autoFocus
              />
            </div>
          )}
          {tree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              dropTargetPath={dropTargetPath}
              onDragMouseDown={handleDragMouseDown}
            />
          ))}
          {tree.length === 0 && !isCreatingRoot && (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs gap-2 px-3 text-center">
              <p>Vault is empty</p>
              <p className="text-[10px]">Use buttons above to create files</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Floating drag indicator */}
      {drag?.active && (
        <DragOverlay
          label={drag.sourceLabel}
          x={drag.currentX}
          y={drag.currentY}
        />
      )}
    </div>
  );
}
