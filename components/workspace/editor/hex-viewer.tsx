"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HexViewerProps {
  data: string; // base64
  filename: string;
}

export function HexViewer({ data, filename }: HexViewerProps) {
  const bytes = useMemo(() => {
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      arr[i] = binary.charCodeAt(i);
    }
    return arr;
  }, [data]);

  const rows = useMemo(() => {
    const result: {
      offset: string;
      hex: string[];
      ascii: string;
    }[] = [];

    const maxRows = 1000; // Limit to prevent performance issues
    const totalRows = Math.ceil(bytes.length / 16);
    const displayRows = Math.min(totalRows, maxRows);

    for (let i = 0; i < displayRows; i++) {
      const offset = (i * 16).toString(16).padStart(8, "0").toUpperCase();
      const hex: string[] = [];
      let ascii = "";

      for (let j = 0; j < 16; j++) {
        const idx = i * 16 + j;
        if (idx < bytes.length) {
          hex.push(bytes[idx].toString(16).padStart(2, "0").toUpperCase());
          const char = bytes[idx];
          ascii += char >= 0x20 && char <= 0x7e ? String.fromCharCode(char) : ".";
        } else {
          hex.push("  ");
          ascii += " ";
        }
      }

      result.push({ offset, hex, ascii });
    }

    return result;
  }, [bytes]);

  const sizeStr = useMemo(() => {
    if (bytes.length < 1024) return `${bytes.length} B`;
    if (bytes.length < 1024 * 1024)
      return `${(bytes.length / 1024).toFixed(1)} KB`;
    return `${(bytes.length / (1024 * 1024)).toFixed(1)} MB`;
  }, [bytes]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-muted/30 text-xs text-muted-foreground">
        <span>{filename}</span>
        <span>{sizeStr}</span>
        <span>Binary file (read-only)</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 font-mono text-xs leading-5">
          {/* Header */}
          <div className="flex text-muted-foreground mb-1 select-none">
            <span className="w-20 shrink-0">Offset</span>
            <span className="flex-1">
              00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F
            </span>
            <span className="w-40 shrink-0 pl-4">ASCII</span>
          </div>

          {rows.map((row) => (
            <div key={row.offset} className="flex hover:bg-accent/20">
              <span className="w-20 shrink-0 text-primary/70 select-none">
                {row.offset}
              </span>
              <span className="flex-1 text-foreground">
                {row.hex.slice(0, 8).join(" ")}
                {"  "}
                {row.hex.slice(8).join(" ")}
              </span>
              <span className="w-40 shrink-0 pl-4 text-muted-foreground">
                {row.ascii}
              </span>
            </div>
          ))}

          {bytes.length > 16000 && (
            <div className="text-muted-foreground mt-2 text-center">
              Showing first {Math.min(1000, Math.ceil(bytes.length / 16))} rows
              of {Math.ceil(bytes.length / 16)}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
