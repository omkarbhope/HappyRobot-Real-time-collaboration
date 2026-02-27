"use client";

import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type { Project, Task, Comment, PresenceUser } from "@/types/board";
import {
  type Tool,
  getDefaultActiveTool,
  isShapeTaskType,
} from "./tool-registry";

export type { Tool };
export interface ClipboardItem {
  nodes: Node[];
  edges: Edge[];
}

export interface CursorState {
  x: number;
  y: number;
  name: string | null;
  image: string | null;
}

export interface BoardLayer {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

export interface BoardState {
  project: Project | null;
  nodes: Node[];
  edges: Edge[];
  activeTool: Tool;
  layers: BoardLayer[];
  nodeLayerId: Record<string, string>;
  activeLayerId: string;
  presence: PresenceUser[];
  commentsByTask: Record<string, Comment[]>;
  commentCountByTaskId: Record<string, number>;
  commentPositionByTaskId: Record<string, { x: number; y: number }>;
  openCommentTaskId: string | null;
  commentsPanelOpen: boolean;
  lastEventId: string | null;
  focusStickyId: string | null;
  clipboard: ClipboardItem | null;
  cursors: Record<string, CursorState>;
  showMinimap: boolean;
  setProject: (p: Project | null) => void;
  setNodes: (n: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (e: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  setActiveTool: (t: Tool) => void;
  setLayers: (l: BoardLayer[] | ((prev: BoardLayer[]) => BoardLayer[])) => void;
  setNodeLayerId: (nodeId: string, layerId: string) => void;
  setActiveLayerId: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  addLayer: (name: string) => void;
  setClipboard: (item: ClipboardItem | null) => void;
  setCursor: (userId: string, state: CursorState | null) => void;
  setShowMinimap: (show: boolean) => void;
  setPresence: (p: PresenceUser[] | ((prev: PresenceUser[]) => PresenceUser[])) => void;
  setCommentsForTask: (taskId: string, comments: Comment[]) => void;
  setCommentCountByTaskId: (counts: Record<string, number>) => void;
  setCommentPositionByTaskId: (positions: Record<string, { x: number; y: number }>) => void;
  setOpenCommentTaskId: (id: string | null) => void;
  setCommentsPanelOpen: (open: boolean) => void;
  setLastEventId: (id: string | null) => void;
  setFocusStickyId: (id: string | null) => void;
  applyTasksToFlow: (tasks: Task[]) => void;
  addOrUpdateTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  addOrUpdateComment: (taskId: string, comment: Comment) => void;
  removeComment: (taskId: string, commentId: string) => void;
  updateComment: (taskId: string, commentId: string, content: string) => void;
  presenceJoin: (user: PresenceUser) => void;
  presenceLeave: (userId: string) => void;
  reset: () => void;
}

const defaultState = {
  project: null,
  nodes: [],
  edges: [],
  activeTool: getDefaultActiveTool(),
  layers: [{ id: "default", name: "Default", visible: true, order: 0 }] as BoardLayer[],
  nodeLayerId: {} as Record<string, string>,
  activeLayerId: "default",
  presence: [],
  commentsByTask: {},
  commentCountByTaskId: {},
  commentPositionByTaskId: {},
  openCommentTaskId: null,
  commentsPanelOpen: false,
  lastEventId: null,
  focusStickyId: null,
  clipboard: null,
  cursors: {},
  showMinimap: true,
};

function tasksToNodesAndEdges(tasks: Task[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  for (const task of tasks) {
    const config = task.configuration;
    const type = config?.type ?? "sticky";
    if (type === "connector") {
      const deps = task.dependencies ?? [];
      if (deps.length >= 2) {
        edges.push({
          id: task.id,
          source: deps[0],
          target: deps[1],
          type: "smoothstep",
        });
      }
    } else if (type === "frame") {
      const pos = config?.position ?? { x: 0, y: 0 };
      const size = config?.size ?? { w: 400, h: 300 };
      nodes.push({
        id: task.id,
        type: "frame",
        position: { x: pos.x, y: pos.y },
        data: { label: task.title, taskId: task.id, width: size.w, height: size.h, ...(config as { customFields?: Record<string, unknown> })?.customFields },
      });
    } else if (isShapeTaskType(type)) {
      const pos = config?.position ?? { x: 0, y: 0 };
      const size = config?.size ?? { w: 120, h: 80 };
      const rotation = (config as { rotation?: number })?.rotation;
      nodes.push({
        id: task.id,
        type: "shape",
        position: { x: pos.x, y: pos.y },
        parentId: task.parentId ?? undefined,
        data: {
          taskId: task.id,
          shape: type,
          width: size.w,
          height: size.h,
          ...(rotation != null && { rotation }),
          ...(config as { customFields?: Record<string, unknown> })?.customFields,
        },
      });
    } else if (type === "text") {
      const pos = config?.position ?? { x: 0, y: 0 };
      const size = config?.size ?? { w: 200, h: 40 };
      nodes.push({
        id: task.id,
        type: "text",
        position: { x: pos.x, y: pos.y },
        parentId: task.parentId ?? undefined,
        data: { label: task.title, taskId: task.id, width: size.w, height: size.h },
      });
    } else if (type === "freehand") {
      const pos = config?.position ?? { x: 0, y: 0 };
      const size = config?.size ?? { w: 100, h: 100 };
      const pathD = (config as { pathD?: string })?.pathD ?? "";
      nodes.push({
        id: task.id,
        type: "freehand",
        position: { x: pos.x, y: pos.y },
        parentId: task.parentId ?? undefined,
        data: { taskId: task.id, pathD, width: size.w, height: size.h },
      });
    } else {
      const pos = config?.position ?? { x: 0, y: 0 };
      const size = config?.size ?? { w: 200, h: 120 };
      const contentHtml = (config as { contentHtml?: string })?.contentHtml;
      const customFields = (config as { customFields?: Record<string, unknown> })?.customFields;
      nodes.push({
        id: task.id,
        type: "sticky",
        position: { x: pos.x, y: pos.y },
        parentId: task.parentId ?? undefined,
        data: { label: task.title, taskId: task.id, width: size.w, height: size.h, contentHtml, ...(customFields && { ...customFields }) },
      });
    }
  }
  return { nodes, edges };
}

function getLayersFromProject(project: Project | null): BoardLayer[] | undefined {
  if (!project?.metadata) return undefined;
  const layers = (project.metadata as { layers?: BoardLayer[] }).layers;
  if (!Array.isArray(layers) || layers.length === 0) return undefined;
  return layers;
}

export const useBoardStore = create<BoardState>((set) => ({
  ...defaultState,

  setProject: (project) =>
    set((s) => {
      const nextLayers = getLayersFromProject(project);
      const next: { project: Project | null; layers?: BoardLayer[]; activeLayerId?: string } = {
        project,
        ...(nextLayers != null && { layers: nextLayers }),
      };
      if (nextLayers != null && nextLayers.length > 0) {
        const layerIds = new Set(nextLayers.map((l) => l.id));
        if (!layerIds.has(s.activeLayerId)) next.activeLayerId = "default";
      }
      return next;
    }),

  setClipboard: (clipboard) => set({ clipboard }),

  setCursor: (userId, state) =>
    set((s) => {
      if (state == null) {
        const { [userId]: _, ...rest } = s.cursors;
        return { cursors: rest };
      }
      return { cursors: { ...s.cursors, [userId]: state } };
    }),

  setShowMinimap: (showMinimap) => set({ showMinimap }),

  setNodes: (n) =>
    set((s) => ({
      nodes: typeof n === "function" ? n(s.nodes) : n,
    })),

  setEdges: (e) =>
    set((s) => ({
      edges: typeof e === "function" ? e(s.edges) : e,
    })),

  setActiveTool: (activeTool) => set({ activeTool }),

  setLayers: (l) =>
    set((s) => ({
      layers: typeof l === "function" ? l(s.layers) : l,
    })),

  setNodeLayerId: (nodeId, layerId) =>
    set((s) => ({
      nodeLayerId: { ...s.nodeLayerId, [nodeId]: layerId },
    })),

  setActiveLayerId: (activeLayerId) => set({ activeLayerId }),

  toggleLayerVisibility: (layerId) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)),
    })),

  addLayer: (name) =>
    set((s) => {
      const id = `layer-${Date.now()}`;
      const order = s.layers.length;
      return { layers: [...s.layers, { id, name, visible: true, order }] };
    }),

  setPresence: (p) =>
    set((s) => ({
      presence: typeof p === "function" ? p(s.presence) : p,
    })),

  setCommentsForTask: (taskId, comments) =>
    set((s) => ({
      commentsByTask: { ...s.commentsByTask, [taskId]: comments },
    })),

  setCommentCountByTaskId: (commentCountByTaskId) => set({ commentCountByTaskId }),

  setCommentPositionByTaskId: (commentPositionByTaskId) => set({ commentPositionByTaskId }),

  setOpenCommentTaskId: (openCommentTaskId) => set({ openCommentTaskId }),

  setCommentsPanelOpen: (commentsPanelOpen) => set({ commentsPanelOpen }),

  setLastEventId: (lastEventId) => set({ lastEventId }),

  setFocusStickyId: (focusStickyId) => set({ focusStickyId }),

  applyTasksToFlow: (tasks) => {
    const { nodes, edges } = tasksToNodesAndEdges(tasks);
    const nodeLayerId: Record<string, string> = {};
    for (const task of tasks) {
      const type = task.configuration?.type ?? "sticky";
      if (type !== "connector") {
        nodeLayerId[task.id] = task.configuration?.layerId ?? "default";
      }
    }
    set({ nodes, edges, nodeLayerId });
  },

  addOrUpdateTask: (task) => {
    const config = task.configuration;
    const type = config?.type ?? "sticky";
    const layerId = config?.layerId ?? "default";
    set((s) => {
      const prevNode = s.nodes.find((n) => n.id === task.id);
      const preserveSelection = (node: Node) =>
        prevNode ? { ...node, selected: prevNode.selected, dragging: prevNode.dragging } : node;

      if (type === "connector") {
        const deps = task.dependencies ?? [];
        if (deps.length < 2) return s;
        const newEdges = s.edges.filter((e) => e.id !== task.id);
        newEdges.push({
          id: task.id,
          source: deps[0],
          target: deps[1],
          type: "smoothstep",
        });
        return { edges: newEdges };
      }
      const pos = config?.position ?? { x: 0, y: 0 };
      const size = config?.size ?? { w: 200, h: 120 };
      const nextNodeLayerId = { ...s.nodeLayerId, [task.id]: layerId };
      if (type === "frame") {
        const newNode = preserveSelection({
          id: task.id,
          type: "frame",
          position: { x: pos.x, y: pos.y },
          data: { label: task.title, taskId: task.id, width: size.w, height: size.h, ...(config as { customFields?: Record<string, unknown> })?.customFields },
        });
        const newNodes = s.nodes.filter((n) => n.id !== task.id);
        newNodes.push(newNode);
        return { nodes: newNodes, nodeLayerId: nextNodeLayerId };
      }
      if (isShapeTaskType(type)) {
        const rotation = (config as { rotation?: number })?.rotation;
        const newNode = preserveSelection({
          id: task.id,
          type: "shape",
          position: { x: pos.x, y: pos.y },
          parentId: task.parentId ?? undefined,
          data: {
            taskId: task.id,
            shape: type,
            width: size.w,
            height: size.h,
            ...(rotation != null && { rotation }),
            ...(config as { customFields?: Record<string, unknown> })?.customFields,
          },
        });
        const newNodes = s.nodes.filter((n) => n.id !== task.id);
        newNodes.push(newNode);
        return { nodes: newNodes, nodeLayerId: nextNodeLayerId };
      }
      if (type === "text") {
        const newNode = preserveSelection({
          id: task.id,
          type: "text",
          position: { x: pos.x, y: pos.y },
          parentId: task.parentId ?? undefined,
          data: { label: task.title, taskId: task.id, width: size.w, height: size.h },
        });
        const newNodes = s.nodes.filter((n) => n.id !== task.id);
        newNodes.push(newNode);
        return { nodes: newNodes, nodeLayerId: nextNodeLayerId };
      }
      if (type === "freehand") {
        const pathD = (config as { pathD?: string })?.pathD ?? "";
        const freehandSize = config?.size ?? { w: 100, h: 100 };
        const newNode = preserveSelection({
          id: task.id,
          type: "freehand",
          position: { x: pos.x, y: pos.y },
          parentId: task.parentId ?? undefined,
          data: { taskId: task.id, pathD, width: freehandSize.w, height: freehandSize.h },
        });
        const newNodes = s.nodes.filter((n) => n.id !== task.id);
        newNodes.push(newNode);
        return { nodes: newNodes, nodeLayerId: nextNodeLayerId };
      }
      const contentHtml = (config as { contentHtml?: string })?.contentHtml;
      const customFieldsFromTask = (config as { customFields?: Record<string, unknown> })?.customFields;
      const prevData = prevNode?.data as Record<string, unknown> | undefined;
      const prevCustomFields: Record<string, unknown> = {};
      if (prevData?.fill != null) prevCustomFields.fill = prevData.fill;
      if (prevData?.stroke != null) prevCustomFields.stroke = prevData.stroke;
      const customFields = { ...prevCustomFields, ...(customFieldsFromTask ?? {}) };
      const newNode = preserveSelection({
        id: task.id,
        type: "sticky",
        position: { x: pos.x, y: pos.y },
        parentId: task.parentId ?? undefined,
        data: { label: task.title, taskId: task.id, width: size.w, height: size.h, contentHtml, ...(Object.keys(customFields).length > 0 && customFields) },
      });
      const newNodes = s.nodes.filter((n) => n.id !== task.id);
      newNodes.push(newNode);
      return { nodes: newNodes, nodeLayerId: nextNodeLayerId };
    });
  },

  removeTask: (taskId) =>
    set((s) => {
      const { [taskId]: _, ...restNodeLayerId } = s.nodeLayerId;
      return {
        nodes: s.nodes.filter((n) => n.id !== taskId),
        edges: s.edges.filter((e) => e.id !== taskId && e.source !== taskId && e.target !== taskId),
        nodeLayerId: restNodeLayerId,
      };
    }),

  addOrUpdateComment: (taskId, comment) =>
    set((s) => {
      const list = s.commentsByTask[taskId] ?? [];
      const idx = list.findIndex((c) => c.id === comment.id);
      const next =
        idx >= 0
          ? list.map((c) => (c.id === comment.id ? comment : c))
          : [...list, comment];
      const commentCountByTaskId = { ...s.commentCountByTaskId, [taskId]: next.length };
      return {
        commentsByTask: { ...s.commentsByTask, [taskId]: next },
        commentCountByTaskId,
      };
    }),

  removeComment: (taskId, commentId) =>
    set((s) => {
      const list = (s.commentsByTask[taskId] ?? []).filter((c) => c.id !== commentId);
      const commentCountByTaskId = { ...s.commentCountByTaskId };
      if (list.length === 0) delete commentCountByTaskId[taskId];
      else commentCountByTaskId[taskId] = list.length;
      return {
        commentsByTask: { ...s.commentsByTask, [taskId]: list },
        commentCountByTaskId,
      };
    }),

  updateComment: (taskId, commentId, content) =>
    set((s) => {
      const list = (s.commentsByTask[taskId] ?? []).map((c) =>
        c.id === commentId ? { ...c, content } : c
      );
      return {
        commentsByTask: { ...s.commentsByTask, [taskId]: list },
      };
    }),

  presenceJoin: (user) =>
    set((s) => {
      if (s.presence.some((p) => p.userId === user.userId)) return s;
      return { presence: [...s.presence, user] };
    }),

  presenceLeave: (userId) =>
    set((s) => ({
      presence: s.presence.filter((p) => p.userId !== userId),
    })),

  reset: () => set({ ...defaultState, clipboard: null }),
}));
