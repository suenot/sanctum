"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ImageViewerProps {
  data: string; // base64
  mimeType: string;
  filename: string;
}

export function ImageViewer({ data, mimeType, filename }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={() => setZoom((z) => Math.max(25, z - 25))}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
          {zoom}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={() => setZoom((z) => Math.min(400, z + 25))}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={() => setZoom(100)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#1e1e1e]">
        {/* Checkerboard background for transparency */}
        <div
          className="relative"
          style={{
            backgroundImage:
              "repeating-conic-gradient(#333 0% 25%, #2a2a2a 0% 50%)",
            backgroundSize: "16px 16px",
          }}
        >
          <img
            src={`data:${mimeType};base64,${data}`}
            alt={filename}
            style={{
              maxWidth: "none",
              width: `${zoom}%`,
              imageRendering: zoom > 200 ? "pixelated" : "auto",
            }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
