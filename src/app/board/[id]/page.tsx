"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRequireAuth } from "@/features/auth/use-require-auth";
import { useBoardStore } from "@/features/board/board-store";
import { BoardTopBar } from "@/features/board/board-top-bar";
import { ToolPalette } from "@/features/board/tool-palette";
import { LayersPanel } from "@/features/board/layers-panel";
import { FormatPanel } from "@/features/board/format-panel";
import { NodeContextMenu } from "@/features/board/node-context-menu";
import { FindReplaceDialog } from "@/features/board/find-replace-dialog";
import { BoardCanvas } from "@/features/canvas/board-canvas";
import type { FreehandStrokeResult } from "@/features/canvas/use-freehand-draw";
import { useBoardWs } from "@/features/realtime/use-board-ws";
import { useUndoKeyboard } from "@/features/undo/use-undo-keyboard";
import { useCopyPasteDuplicate } from "@/features/board/use-copy-paste";
import { CommentsPanel } from "@/features/comments/comments-panel";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";
import { getDebouncedTaskPatch } from "@/lib/debounced-task-patch";
import { getToolDef, getTaskTypeFromNode } from "@/features/board/tool-registry";
import type { Project } from "@/types/board";
import type { Task } from "@/types/board";
import type { CommentSummaryItem } from "@/features/comments/service";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = typeof params.id === "string" ? params.id : null;
  useRequireAuth();
  const { data: session, status } = useSession();

  const project = useBoardStore((s) => s.project);
  const setProject = useBoardStore((s) => s.setProject);
  const applyTasksToFlow = useBoardStore((s) => s.applyTasksToFlow);
  const addOrUpdateTask = useBoardStore((s) => s.addOrUpdateTask);
  const setNodes = useBoardStore((s) => s.setNodes);
  const setOpenCommentTaskId = useBoardStore((s) => s.setOpenCommentTaskId);
  const setCommentsPanelOpen = useBoardStore((s) => s.setCommentsPanelOpen);
  const setCommentCountByTaskId = useBoardStore((s) => s.setCommentCountByTaskId);
  const setCommentPositionByTaskId = useBoardStore((s) => s.setCommentPositionByTaskId);
  const setFocusStickyId = useBoardStore((s) => s.setFocusStickyId);
  const removeTask = useBoardStore((s) => s.removeTask);
  const reset = useBoardStore((s) => s.reset);
  const setEdges = useBoardStore((s) => s.setEdges);
  const showMinimap = useBoardStore((s) => s.showMinimap);
  const setShowMinimap = useBoardStore((s) => s.setShowMinimap);
  const commentCountByTaskId = useBoardStore((s) => s.commentCountByTaskId);
  const setActiveTool = useBoardStore((s) => s.setActiveTool);

  const [contextMenu, setContextMenu] = useState<
    { nodeId: string; x: number; y: number; isEdge?: boolean } | null
  >(null);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadedBoardIdRef = useRef<string | null>(null);

  const wsRef = useBoardWs(boardId);
  useUndoKeyboard();
  const { copySelection, paste, duplicate, canPaste } = useCopyPasteDuplicate(boardId);
  const sendCursor = useCallback(
    (point: { x: number; y: number }) => {
      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: "cursor", x: point.x, y: point.y }));
      }
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNodes((prev) => prev.map((n) => ({ ...n, selected: false })));
        setEdges((prev) => prev.map((e) => ({ ...e, selected: false })));
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setNodes, setEdges]);

  useEffect(() => {
    const win = window as unknown as {
      __onStickySave?: (id: string, title: string) => void;
      __onStickyResize?: (id: string, w: number, h: number) => void;
      __onTextSave?: (id: string, title: string, position?: { x: number; y: number }, size?: { w: number; h: number }) => void;
      __onTextResize?: (id: string, w: number, h: number) => void;
      __onShapeResize?: (id: string, w: number, h: number, shapeType: string) => void;
      __onFrameResize?: (id: string, w: number, h: number) => void;
      __onFormatChange?: (nodeIds: string[], key: string, value: string) => void;
    };
    const patchTaskDebounced = getDebouncedTaskPatch((taskId, res) => {
      if (res.data) addOrUpdateTask(res.data);
      else toast.error(res.error ?? "Failed to save");
    });

    win.__onShapeResize = (id: string, w: number, h: number, shapeType: string) => {
      const prevNodes = useBoardStore.getState().nodes;
      const prev = prevNodes.find((n) => n.id === id);
      const prevW = (prev?.data as { width?: number })?.width ?? 120;
      const prevH = (prev?.data as { height?: number })?.height ?? 80;
      setNodes((n) =>
        n.map((node) => (node.id === id ? { ...node, data: { ...node.data, width: w, height: h } } : node))
      );
      if (id.startsWith("temp-")) return;
      patchTaskDebounced(id, {
        configuration: {
          type: shapeType,
          position: prev?.position ?? { x: 0, y: 0 },
          size: { w, h },
        },
      });
    };
    win.__onFrameResize = (id: string, w: number, h: number) => {
      const prevNodes = useBoardStore.getState().nodes;
      const prev = prevNodes.find((n) => n.id === id);
      const prevW = (prev?.data as { width?: number })?.width ?? 400;
      const prevH = (prev?.data as { height?: number })?.height ?? 300;
      setNodes((n) =>
        n.map((node) => (node.id === id ? { ...node, data: { ...node.data, width: w, height: h } } : node))
      );
      if (id.startsWith("temp-")) return;
      patchTaskDebounced(id, {
        configuration: {
          type: "frame",
          position: prev?.position ?? { x: 0, y: 0 },
          size: { w, h },
        },
      });
    };
    win.__onTextSave = (
      id: string,
      title: string,
      position?: { x: number; y: number },
      size?: { w: number; h: number }
    ) => {
      const nodes = useBoardStore.getState().nodes;
      const node = nodes.find((n) => n.id === id);
      const pos = position ?? node?.position ?? { x: 0, y: 0 };
      const sz: { w: number; h: number } = size ?? (node?.data ? { w: (node.data as { width?: number }).width ?? 200, h: (node.data as { height?: number }).height ?? 40 } : { w: 200, h: 40 });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label: title, width: sz.w, height: sz.h }, position: pos } : n
        )
      );
      if (id.startsWith("temp-")) return;
      patchTaskDebounced(id, {
        title,
        configuration: { type: "text", position: pos, size: sz },
      });
    };
    win.__onTextResize = (id: string, w: number, h: number) => {
      const prevNodes = useBoardStore.getState().nodes;
      const prev = prevNodes.find((n) => n.id === id);
      const prevW = (prev?.data as { width?: number })?.width ?? 200;
      const prevH = (prev?.data as { height?: number })?.height ?? 40;
      setNodes((n) =>
        n.map((node) => (node.id === id ? { ...node, data: { ...node.data, width: w, height: h } } : node))
      );
      if (id.startsWith("temp-")) return;
      patchTaskDebounced(id, {
        configuration: {
          type: "text",
          position: prev?.position ?? { x: 0, y: 0 },
          size: { w, h },
        },
      });
    };
    win.__onFormatChange = (nodeIds: string[], key: string, value: string) => {
      const nodes = useBoardStore.getState().nodes;
      const updates: Array<{ taskId: string; configuration: Record<string, unknown> }> = [];
      nodeIds.forEach((id) => {
        if (id.startsWith("temp-")) return;
        const node = nodes.find((n) => n.id === id);
        if (!node) return;
        const configType = getTaskTypeFromNode(node);
        const pos = node.position ?? { x: 0, y: 0 };
        const d = node.data as Record<string, unknown>;
        const w = (d?.width as number) ?? 120;
        const h = (d?.height as number) ?? 80;
        const config: Record<string, unknown> = {
          type: configType,
          position: pos,
          size: { w, h },
        };
        if (configType === "sticky" && d?.contentHtml != null) {
          config.contentHtml = d.contentHtml;
        }
        const customFields: Record<string, unknown> = {};
        if (d?.fill != null) customFields.fill = d.fill;
        if (d?.stroke != null) customFields.stroke = d.stroke;
        if (key === "rotation") {
          const num = parseFloat(value);
          if (!Number.isNaN(num)) config.rotation = num;
        } else {
          customFields[key] = value;
        }
        if (Object.keys(customFields).length > 0) config.customFields = customFields;
        updates.push({ taskId: id, configuration: config });
      });
      if (updates.length === 0) return;
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
    };
    win.__onStickySave = (
      id: string,
      title: string,
      contentHtml?: string,
      position?: { x: number; y: number },
      size?: { w: number; h: number },
      customFieldsFromSticky?: Record<string, unknown>
    ) => {
      const nodes = useBoardStore.getState().nodes;
      const node = nodes.find((n) => n.id === id);
      const pos = position ?? node?.position ?? { x: 0, y: 0 };
      const sz: { w: number; h: number } = size ?? (node?.data ? { w: (node.data as { width?: number }).width ?? 200, h: (node.data as { height?: number }).height ?? 120 } : { w: 200, h: 120 });
      const d = node?.data as Record<string, unknown> | undefined;
      const customFields: Record<string, unknown> = { ...(customFieldsFromSticky ?? {}) };
      if (Object.keys(customFields).length === 0) {
        if (d?.fill != null) customFields.fill = d.fill;
        if (d?.stroke != null) customFields.stroke = d.stroke;
      }

      if (contentHtml !== undefined) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, label: title, contentHtml } } : n
          )
        );
      }

      const body: { title: string; configuration?: { type: string; position: { x: number; y: number }; size: { w: number; h: number }; contentHtml?: string; customFields?: Record<string, unknown> } } = { title };
      if (contentHtml !== undefined) {
        body.configuration = { type: "sticky", position: pos, size: sz, contentHtml, ...(Object.keys(customFields).length > 0 && { customFields }) };
      } else {
        body.configuration = { type: "sticky", position: pos, size: sz, ...(Object.keys(customFields).length > 0 && { customFields }) };
      }

      if (id.startsWith("temp-")) return;
      patchTaskDebounced(id, body);
    };
    win.__onStickyResize = (id: string, w: number, h: number) => {
      const prevNodes = useBoardStore.getState().nodes;
      const prev = prevNodes.find((n) => n.id === id);
      const prevW = (prev?.data as { width?: number })?.width ?? 200;
      const prevH = (prev?.data as { height?: number })?.height ?? 120;
      setNodes((n) =>
        n.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, width: w, height: h } } : node
        )
      );
      if (id.startsWith("temp-")) return;
      patchTaskDebounced(id, {
        configuration: {
          type: "sticky",
          position: prev?.position ?? { x: 0, y: 0 },
          size: { w, h },
        },
      });
    };
    return () => {
      delete win.__onStickySave;
      delete win.__onStickyResize;
      delete win.__onTextSave;
      delete win.__onTextResize;
      delete win.__onShapeResize;
      delete win.__onFrameResize;
      delete win.__onFormatChange;
    };
  }, [addOrUpdateTask, setNodes]);

  useEffect(() => {
    if (!boardId || status !== "authenticated") return;

    if (loadedBoardIdRef.current !== boardId) {
      reset();
      loadedBoardIdRef.current = boardId;
    } else {
      const currentProject = useBoardStore.getState().project;
      if (currentProject?.id === boardId) return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const [projRes, tasksRes] = await Promise.all([
        apiGet<Project>(`/api/projects/${boardId}`),
        apiGet<{ items: Task[]; nextCursor: string | null }>(`/api/tasks?projectId=${boardId}&limit=100`),
      ]);

      if (cancelled) return;

      if (projRes.error) {
        setError(projRes.error);
        if (projRes.code === "UNAUTHORIZED") router.replace("/api/auth/signin?callbackUrl=/dashboard");
        setLoading(false);
        return;
      }
      if (tasksRes.error) {
        setError(tasksRes.error);
        setLoading(false);
        return;
      }

      if (projRes.data) setProject(projRes.data);
      if (tasksRes.data?.items) applyTasksToFlow(tasksRes.data.items);
      const summaryRes = await apiGet<CommentSummaryItem[]>(`/api/comments/summary?projectId=${boardId}`);
      if (!cancelled && summaryRes.data) {
        const counts: Record<string, number> = {};
        const positions: Record<string, { x: number; y: number }> = {};
        for (const item of summaryRes.data) {
          counts[item.taskId] = item.count;
          if (item.latest?.position) positions[item.taskId] = item.latest.position;
        }
        setCommentCountByTaskId(counts);
        setCommentPositionByTaskId(positions);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [boardId, status, setProject, applyTasksToFlow, setCommentCountByTaskId, setCommentPositionByTaskId, reset, router]);

  const handleCanvasClick = useCallback(
    (point: { x: number; y: number }) => {
      const activeTool = useBoardStore.getState().activeTool;
      const toolDef = getToolDef(activeTool);
      if (!boardId || toolDef?.category !== "create") return;

      const nodeType = toolDef.nodeType ?? "sticky";
      const size = toolDef.defaultSize ?? { w: 200, h: 120 };
      const title = toolDef.defaultTitle ?? "";
      const tempId = `temp-${Date.now()}`;

      const nodeData: Record<string, unknown> = {
        taskId: tempId,
        width: size.w,
        height: size.h,
      };
      if (nodeType === "sticky" || nodeType === "frame" || nodeType === "text") nodeData.label = title;
      if (nodeType === "shape" && "shape" in toolDef && toolDef.shape) nodeData.shape = toolDef.shape;

      setNodes((prev) => [
        ...prev,
        {
          id: tempId,
          type: nodeType,
          position: point,
          data: nodeData,
        },
      ]);

      apiPost<Task>("/api/tasks", {
        projectId: boardId,
        title,
        configuration: {
          type: toolDef.id,
          position: point,
          size,
          layerId: useBoardStore.getState().activeLayerId,
        },
      }).then((res) => {
        setNodes((prev) => prev.filter((n) => n.id !== tempId));
        if (res.data) {
          addOrUpdateTask(res.data);
          setActiveTool("select");
        } else toast.error(res.error ?? "Failed to create");
      });
    },
    [boardId, addOrUpdateTask, setNodes, setActiveTool]
  );

  const handleFreehandStrokeEnd = useCallback(
    (result: FreehandStrokeResult) => {
      if (!boardId) return;
      apiPost<Task>("/api/tasks", {
        projectId: boardId,
        title: "",
        configuration: {
          type: "freehand",
          position: result.position,
          size: result.size,
          pathD: result.pathD,
          layerId: useBoardStore.getState().activeLayerId,
        },
      }).then((res) => {
        if (res.data) {
          addOrUpdateTask(res.data);
          setActiveTool("select");
        } else toast.error(res.error ?? "Failed to create drawing");
      });
    },
    [boardId, addOrUpdateTask, setActiveTool]
  );

  const handleRename = useCallback(
    async (name: string) => {
      if (!boardId) return;
      const res = await apiPatch<Project>(`/api/projects/${boardId}`, { name });
      if (res.data) setProject(res.data);
      else toast.error(res.error ?? "Failed to rename board");
    },
    [boardId, setProject]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      event.preventDefault();
      setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY, isEdge: false });
    },
    []
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: { id: string }) => {
      event.preventDefault();
      setContextMenu({ nodeId: edge.id, x: event.clientX, y: event.clientY, isEdge: true });
    },
    []
  );

  const handleDeleteTask = useCallback((taskId: string) => {
    apiDelete(`/api/tasks/${taskId}`).then((res) => {
      if (res.error) {
        toast.error(res.error ?? "Failed to delete");
        return;
      }
      removeTask(taskId);
    });
  }, [removeTask]);

  const handleCanvasDelete = useCallback(
    ({ nodeIds, edgeIds }: { nodeIds: string[]; edgeIds: string[] }) => {
      const ids = [...nodeIds, ...edgeIds];
      ids.forEach((id) => handleDeleteTask(id));
    },
    [handleDeleteTask]
  );

  const showInitialLoading =
    !boardId ||
    (status === "loading" && !(loadedBoardIdRef.current === boardId && project?.id === boardId));

  if (showInitialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">{error}</p>
        <button
          type="button"
          className="text-primary underline"
          onClick={() => router.push("/dashboard")}
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (loading || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading board…</p>
      </div>
    );
  }

  const isOwner = session?.user?.id === project.ownerId;

  return (
    <div className="flex h-screen flex-col">
      <BoardTopBar
        boardName={project.name}
        isOwner={isOwner}
        onRename={handleRename}
        projectId={project.id}
        userImage={session?.user?.image}
        userName={session?.user?.name}
        showMinimap={showMinimap}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        onOpenComments={() => {
          setCommentsPanelOpen(true);
          setOpenCommentTaskId(null);
        }}
        onOpenCommentTask={(taskId) => {
          setOpenCommentTaskId(taskId);
          setCommentsPanelOpen(true);
        }}
        commentCount={Object.values(commentCountByTaskId).reduce((a, b) => a + b, 0)}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-3">
          <ToolPalette />
          <LayersPanel />
          <FormatPanel />
        </div>

        <div className="flex-1">
          <BoardCanvas
            projectId={project.id}
            onCanvasClick={handleCanvasClick}
            onConnectorEnd={undefined}
            onFreehandStrokeEnd={handleFreehandStrokeEnd}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeContextMenu={handleEdgeContextMenu}
            onDelete={handleCanvasDelete}
            sendCursor={sendCursor}
            showMinimap={showMinimap}
          />
        </div>
      </div>

      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          isEdge={contextMenu.isEdge}
          onEdit={
            !contextMenu.isEdge
              ? () => setFocusStickyId(contextMenu.nodeId)
              : undefined
          }
          onComment={() => {
            setOpenCommentTaskId(contextMenu.nodeId);
            setCommentsPanelOpen(true);
          }}
          onDelete={() => handleDeleteTask(contextMenu.nodeId)}
          onCopy={copySelection}
          onPaste={paste}
          onDuplicate={duplicate}
          canPaste={canPaste}
          onClose={() => setContextMenu(null)}
        />
      )}

      <FindReplaceDialog open={findReplaceOpen} onOpenChange={setFindReplaceOpen} />

      <CommentsPanel />
    </div>
  );
}
