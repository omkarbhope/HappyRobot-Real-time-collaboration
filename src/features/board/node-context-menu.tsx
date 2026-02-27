"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  isEdge?: boolean;
  onEdit?: () => void;
  onComment: () => void;
  onDelete: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  canPaste?: boolean;
  onClose: () => void;
}

export function NodeContextMenu({
  x,
  y,
  nodeId: _nodeId,
  isEdge,
  onEdit,
  onComment,
  onDelete,
  onCopy,
  onPaste,
  onDuplicate,
  canPaste,
  onClose,
}: NodeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md"
      style={{ left: x, top: y }}
    >
      {!isEdge && onEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            onEdit();
            onClose();
          }}
        >
          Edit
        </Button>
      )}
      {onCopy && (
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onCopy(); onClose(); }}>
          Copy
        </Button>
      )}
      {onPaste && (
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onPaste(); onClose(); }} disabled={!canPaste}>
          Paste
        </Button>
      )}
      {onDuplicate && (
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { onDuplicate(); onClose(); }}>
          Duplicate
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        onClick={() => {
          onComment();
          onClose();
        }}
      >
        Comment
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-destructive hover:text-destructive"
        onClick={() => {
          onDelete();
          onClose();
        }}
      >
        Delete
      </Button>
    </div>,
    document.body
  );
}
