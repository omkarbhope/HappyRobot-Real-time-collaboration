"use client";

import { useEffect, useCallback } from "react";
import { apiPost } from "@/lib/api";
import { useBoardStore } from "@/features/board/board-store";

export function useUndoKeyboard() {
  const lastEventId = useBoardStore((s) => s.lastEventId);
  const pushRedo = useBoardStore((s) => s.pushRedo);
  const popRedo = useBoardStore((s) => s.popRedo);

  const performUndo = useCallback(() => {
    if (!lastEventId) return;
    pushRedo(lastEventId);
    apiPost("/api/events/undo", { eventId: lastEventId });
  }, [lastEventId, pushRedo]);

  const performRedo = useCallback(() => {
    const eventId = popRedo();
    if (!eventId) return;
    apiPost("/api/events/redo", { eventId });
  }, [popRedo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          performRedo();
        } else {
          e.preventDefault();
          performUndo();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [performUndo, performRedo]);
}
