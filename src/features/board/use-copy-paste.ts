"use client";

import { useCallback, useEffect } from "react";
import type { Node, Edge } from "@xyflow/react";
import { useBoardStore } from "./board-store";
import { getTaskTypeFromNode } from "./tool-registry";
import { apiPost } from "@/lib/api";
import type { Task } from "@/types/board";
import { toast } from "sonner";

const PASTE_OFFSET = { x: 20, y: 20 };

export function useCopyPasteDuplicate(projectId: string | null) {
  const nodes = useBoardStore((s) => s.nodes);
  const edges = useBoardStore((s) => s.edges);
  const setClipboard = useBoardStore((s) => s.setClipboard);
  const clipboard = useBoardStore((s) => s.clipboard);
  const addOrUpdateTask = useBoardStore((s) => s.addOrUpdateTask);

  const copySelection = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
    setClipboard({ nodes: selectedNodes, edges: selectedEdges });
  }, [nodes, edges, setClipboard]);

  const doPaste = useCallback(
    async (items: { nodes: Node[]; edges: Edge[] }) => {
      if (!projectId || (items.nodes.length === 0 && items.edges.length === 0)) return;
      const idMap = new Map<string, string>();
      const offset = PASTE_OFFSET;
      for (const node of items.nodes) {
      const pos = node.position;
      const newPos = { x: pos.x + offset.x, y: pos.y + offset.y };
      const data = node.data as { label?: string; taskId?: string; width?: number; height?: number; shape?: string; contentHtml?: string; pathD?: string };
      const w = data?.width ?? 200;
      const h = data?.height ?? 120;
      const configType = getTaskTypeFromNode(node);
      const activeLayerId = useBoardStore.getState().activeLayerId;
      const body: { projectId: string; title: string; configuration: { type: string; position: { x: number; y: number }; size: { w: number; h: number }; layerId?: string; contentHtml?: string; pathD?: string } } = {
        projectId,
        title: (data?.label as string) ?? "",
        configuration: { type: configType, position: newPos, size: { w, h }, layerId: activeLayerId },
      };
      if (data?.contentHtml && configType === "sticky") body.configuration.contentHtml = data.contentHtml;
      if (data?.pathD && configType === "freehand") body.configuration.pathD = data.pathD;
      const res = await apiPost<Task>("/api/tasks", body);
      if (res.data) {
        idMap.set(node.id, res.data.id);
        addOrUpdateTask(res.data);
      } else {
        toast.error(res.error ?? "Failed to paste");
        return;
      }
    }
    for (const edge of items.edges) {
      const newSource = idMap.get(edge.source);
      const newTarget = idMap.get(edge.target);
      if (!newSource || !newTarget) continue;
      const res = await apiPost<Task>("/api/tasks", {
        projectId,
        title: "",
        configuration: { type: "connector" },
        dependencies: [newSource, newTarget],
      });
      if (res.data) addOrUpdateTask(res.data);
      else toast.error(res.error ?? "Failed to paste connector");
    }
  },
    [projectId, addOrUpdateTask]
  );

  const paste = useCallback(async () => {
    if (clipboard) await doPaste(clipboard);
  }, [clipboard, doPaste]);

  const duplicate = useCallback(async () => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
    await doPaste({ nodes: selectedNodes, edges: selectedEdges });
  }, [nodes, edges, doPaste]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "c") {
        e.preventDefault();
        copySelection();
      }
      if (mod && e.key === "v") {
        e.preventDefault();
        paste();
      }
      if (mod && e.key === "d") {
        e.preventDefault();
        duplicate();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [copySelection, paste, duplicate]);

  return { copySelection, paste, duplicate, canPaste: !!clipboard && (clipboard.nodes.length > 0 || clipboard.edges.length > 0) };
}
