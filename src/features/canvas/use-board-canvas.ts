"use client";

import { useCallback, useRef } from "react";
import { type Node } from "@xyflow/react";
import { toast } from "sonner";
import { apiPost, apiPatch } from "@/lib/api";
import type { Task } from "@/types/board";
import type { BoardState } from "@/features/board/board-store";
import { useBoardStore } from "@/features/board/board-store";
import { getTaskTypeFromNode } from "@/features/board/tool-registry";

const DRAG_BATCH_MS = 50;

interface UseBoardCanvasProps {
  projectId: string;
  onCanvasClick?: (point: { x: number; y: number }) => void;
  onConnectorEnd?: (sourceId: string, targetId: string) => void;
  addOrUpdateTask: BoardState["addOrUpdateTask"];
  removeTask: BoardState["removeTask"];
  setNodes: BoardState["setNodes"];
  flowPositionRef?: React.MutableRefObject<((p: { x: number; y: number }) => { x: number; y: number }) | null>;
}

export function useBoardCanvas({
  projectId,
  onCanvasClick,
  onConnectorEnd,
  addOrUpdateTask,
  removeTask,
  setNodes,
  flowPositionRef,
}: UseBoardCanvasProps) {
  const pendingDragUpdatesRef = useRef<
    Map<string, { position: { x: number; y: number }; configuration: Record<string, unknown> }>
  >(new Map());
  const flushDragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushDragBatch = useCallback(() => {
    if (flushDragTimeoutRef.current !== null) {
      clearTimeout(flushDragTimeoutRef.current);
      flushDragTimeoutRef.current = null;
    }
    const map = pendingDragUpdatesRef.current;
    if (map.size === 0) return;
    const updates = Array.from(map.entries()).map(([taskId, { configuration }]) => ({
      taskId,
      configuration,
    }));
    const positionsByNodeId = new Map(Array.from(map.entries()).map(([id, { position }]) => [id, position]));
    map.clear();
    setNodes((prev: Node[]) =>
      prev.map((n) => {
        const position = positionsByNodeId.get(n.id);
        return position ? { ...n, position } : n;
      })
    );
    apiPatch<{ results: Array<{ taskId: string; task: Task | null }> }>("/api/tasks/bulk", { updates }).then(
      (res) => {
        if (res.data?.results) {
          for (const { task } of res.data.results) {
            if (task) addOrUpdateTask(task);
          }
        } else {
          toast.error((res as { error?: string }).error ?? "Failed to save");
        }
      }
    );
  }, [addOrUpdateTask, setNodes]);

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!onCanvasClick) return;
      const toFlow = flowPositionRef?.current;
      if (toFlow) {
        const flowPos = toFlow({ x: event.clientX, y: event.clientY });
        onCanvasClick(flowPos);
        return;
      }
      const x = event.clientX;
      const y = event.clientY;
      requestAnimationFrame(() => {
        const toFlowRetry = flowPositionRef?.current;
        if (toFlowRetry && onCanvasClick) {
          onCanvasClick(toFlowRetry({ x, y }));
        }
      });
    },
    [onCanvasClick, flowPositionRef]
  );

  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const pos = node.position;
      const data = node.data as { width?: number; height?: number; shape?: string };
      const width = data?.width ?? 200;
      const height = data?.height ?? 120;
      const configType = getTaskTypeFromNode(node);
      if (node.id.startsWith("temp-")) return;
      pendingDragUpdatesRef.current.set(node.id, {
        position: { x: pos.x, y: pos.y },
        configuration: {
          type: configType,
          position: { x: pos.x, y: pos.y },
          size: { w: width, h: height },
        },
      });
      if (flushDragTimeoutRef.current === null) {
        flushDragTimeoutRef.current = setTimeout(flushDragBatch, DRAG_BATCH_MS);
      }
    },
    [flushDragBatch]
  );

  const handleConnect = useCallback(
    (sourceId: string, targetId: string) => {
      if (onConnectorEnd) {
        onConnectorEnd(sourceId, targetId);
        return;
      }
      apiPost<Task>("/api/tasks", {
        projectId,
        title: "",
        configuration: { type: "connector" },
        dependencies: [sourceId, targetId],
      }).then((res) => {
        if (res.data) {
          addOrUpdateTask(res.data);
          useBoardStore.getState().setActiveTool("select");
        } else toast.error((res as { error?: string }).error ?? "Failed to create connector");
      });
    },
    [projectId, onConnectorEnd, addOrUpdateTask]
  );

  return { handlePaneClick, handleNodeDragStop, handleConnect };
}
