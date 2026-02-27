"use client";

import { useEffect, useCallback } from "react";
import { apiPost } from "@/lib/api";
import { useBoardStore } from "@/features/board/board-store";

export function useUndoKeyboard() {
  const lastEventId = useBoardStore((s) => s.lastEventId);

  const performUndo = useCallback(() => {
    if (!lastEventId) return;
    apiPost("/api/events/undo", { eventId: lastEventId });
  }, [lastEventId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [performUndo]);
}
