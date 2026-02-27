"use client";

import { useEffect, useRef, useCallback } from "react";
import { useBoardStore } from "@/features/board/board-store";
import { BOARD_EVENT_TYPES } from "@/shared/constants/events";
import type { Task, Comment, Project } from "@/types/board";

function getWsUrl(boardId: string): string {
  if (typeof window === "undefined") return "";
  const base = window.location.origin.replace(/^http/, "ws");
  return `${base}/ws?boardId=${boardId}`;
}

export function useBoardWs(boardId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addOrUpdateTask = useBoardStore((s) => s.addOrUpdateTask);
  const removeTask = useBoardStore((s) => s.removeTask);
  const addOrUpdateComment = useBoardStore((s) => s.addOrUpdateComment);
  const removeComment = useBoardStore((s) => s.removeComment);
  const presenceJoin = useBoardStore((s) => s.presenceJoin);
  const presenceLeave = useBoardStore((s) => s.presenceLeave);
  const setCursor = useBoardStore((s) => s.setCursor);
  const setLastEventId = useBoardStore((s) => s.setLastEventId);
  const setProject = useBoardStore((s) => s.setProject);

  const applyMessage = useCallback(
    (msg: Record<string, unknown>) => {
      const type = msg.type as string;
      if (type === BOARD_EVENT_TYPES.TASK_CREATED && msg.task) {
        if (process.env.NODE_ENV === "development") {
          console.debug("[board-ws] applying task.created", (msg.task as { id?: string })?.id);
        }
        addOrUpdateTask(msg.task as Task);
        if (msg.eventId) setLastEventId(msg.eventId as string);
      } else if (type === BOARD_EVENT_TYPES.TASK_UPDATED && msg.task) {
        if (process.env.NODE_ENV === "development") {
          console.debug("[board-ws] applying task.updated", (msg.task as { id?: string })?.id);
        }
        addOrUpdateTask(msg.task as Task);
        if (msg.eventId) setLastEventId(msg.eventId as string);
      } else if (type === BOARD_EVENT_TYPES.TASK_DELETED && msg.taskId) {
        if (process.env.NODE_ENV === "development") {
          console.debug("[board-ws] applying task.deleted", msg.taskId);
        }
        removeTask(msg.taskId as string);
        if (msg.eventId) setLastEventId(msg.eventId as string);
      } else if (type === BOARD_EVENT_TYPES.PROJECT_UPDATED && msg.project) {
        setProject(msg.project as Project);
      } else if (type === BOARD_EVENT_TYPES.COMMENT_ADDED && msg.taskId && msg.comment) {
        addOrUpdateComment(msg.taskId as string, msg.comment as Comment);
        if (msg.eventId) setLastEventId(msg.eventId as string);
      } else if (type === BOARD_EVENT_TYPES.COMMENT_UPDATED && msg.comment) {
        const c = msg.comment as Comment;
        addOrUpdateComment(c.taskId, c);
        if (msg.eventId) setLastEventId(msg.eventId as string);
      } else if (type === BOARD_EVENT_TYPES.COMMENT_DELETED && msg.commentId && msg.taskId) {
        removeComment(msg.taskId as string, msg.commentId as string);
        if (msg.eventId) setLastEventId(msg.eventId as string);
      } else if (type === "presence.join" && msg.userId) {
        presenceJoin({
          userId: msg.userId as string,
          name: (msg.name as string) ?? null,
          image: (msg.image as string) ?? null,
        });
      } else if (type === "presence.leave" && msg.userId) {
        presenceLeave(msg.userId as string);
        setCursor(msg.userId as string, null);
      } else if (type === "cursor" && msg.userId != null && typeof msg.x === "number" && typeof msg.y === "number") {
        setCursor(msg.userId as string, {
          x: msg.x as number,
          y: msg.y as number,
          name: (msg.name as string) ?? null,
          image: (msg.image as string) ?? null,
        });
      } else if (type === BOARD_EVENT_TYPES.UNDO && msg.result) {
        const result = msg.result as { type: string; taskId?: string; commentId?: string };
        if (result.type === "task_deleted" && result.taskId) removeTask(result.taskId);
        else if (result.type === "task_restored" && result.taskId) {
          fetch(`/api/tasks/${result.taskId}`, { credentials: "include" })
            .then((r) => r.json())
            .then((res: { data?: Task }) => res.data && addOrUpdateTask(res.data));
        } else if (result.type === "task_reverted" && result.taskId) {
          fetch(`/api/tasks/${result.taskId}`, { credentials: "include" })
            .then((r) => r.json())
            .then((res: { data?: Task }) => res.data && addOrUpdateTask(res.data));
        } else if (result.type === "comment_deleted" && result.commentId && msg.taskId) {
          removeComment(msg.taskId as string, result.commentId);
        } else if (result.type === "comment_restored" && msg.comment) {
          const c = msg.comment as Comment;
          addOrUpdateComment(c.taskId, c);
        } else if (result.type === "comment_reverted" && msg.comment) {
          const c = msg.comment as Comment;
          addOrUpdateComment(c.taskId, c);
        }
      }
    },
    [
      addOrUpdateTask,
      removeTask,
      setProject,
      addOrUpdateComment,
      removeComment,
      presenceJoin,
      presenceLeave,
      setCursor,
      setLastEventId,
    ]
  );

  const applyMessageRef = useRef(applyMessage);
  applyMessageRef.current = applyMessage;

  useEffect(() => {
    if (!boardId) return;

    let closed = false;
    let delay = 1000;

    function connect() {
      if (closed) return;
      const url = getWsUrl(boardId!);
      if (!url) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        delay = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as Record<string, unknown>;
          if (msg.type === "pong") return;
          applyMessageRef.current(msg);
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!closed) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
            delay = Math.min(delay * 1.5, 10000);
          }, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      closed = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [boardId]);

  return wsRef;
}
