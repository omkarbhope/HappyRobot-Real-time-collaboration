"use client";

import { useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionMode,
  type Connection,
  type OnConnect,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useBoardStore } from "@/features/board/board-store";
import { isCreateTool, isConnectTool } from "@/features/board/tool-registry";
import { StickyNode } from "./sticky-node";
import { TextNode } from "./text-node";
import { ShapeNode } from "@/features/shapes/shape-node";
import { FrameNode } from "@/features/frames/frame-node";
import { FreehandNode } from "./freehand-node";
import { useBoardCanvas } from "@/features/canvas/use-board-canvas";
import { useFreehandDraw, type FreehandStrokeResult } from "@/features/canvas/use-freehand-draw";
import { FreehandOverlay } from "@/features/canvas/freehand-overlay";
import { useFlowPositionRef, FlowPositionRefSetterPanel } from "./flow-position-ref";
import { CursorOverlay } from "@/features/cursors/cursor-overlay";

const nodeTypes: NodeTypes = {
  sticky: StickyNode as NodeTypes["sticky"],
  text: TextNode as NodeTypes["text"],
  shape: ShapeNode as NodeTypes["shape"],
  frame: FrameNode as NodeTypes["frame"],
  freehand: FreehandNode as NodeTypes["freehand"],
};

const CURSOR_THROTTLE_MS = 50;

interface BoardCanvasProps {
  projectId: string;
  onCanvasClick?: (point: { x: number; y: number }) => void;
  onConnectorEnd?: (sourceId: string, targetId: string) => void;
  onFreehandStrokeEnd?: (result: FreehandStrokeResult) => void;
  onNodeContextMenu?: (event: React.MouseEvent, node: { id: string }) => void;
  onEdgeContextMenu?: (event: React.MouseEvent, edge: { id: string }) => void;
  onDelete?: (params: { nodeIds: string[]; edgeIds: string[] }) => void;
  sendCursor?: (point: { x: number; y: number }) => void;
  showMinimap?: boolean;
  /** Called when viewport (pan/zoom) changes. Receives viewport and pane size for bounds calculation. */
  onViewportChange?: (
    viewport: { x: number; y: number; zoom: number },
    paneSize: { width: number; height: number }
  ) => void;
}

export function BoardCanvas({
  projectId,
  onCanvasClick,
  onConnectorEnd,
  onFreehandStrokeEnd,
  onNodeContextMenu,
  onEdgeContextMenu,
  onDelete,
  sendCursor,
  showMinimap = true,
  onViewportChange,
}: BoardCanvasProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const nodesFromStore = useBoardStore((s) => s.nodes);
  const edgesFromStore = useBoardStore((s) => s.edges);
  const layers = useBoardStore((s) => s.layers);
  const nodeLayerId = useBoardStore((s) => s.nodeLayerId);
  const activeTool = useBoardStore((s) => s.activeTool);
  const flowPositionRef = useFlowPositionRef();
  const isFreehandActive = activeTool === "freehand";

  const nodesWithLayerVisibility = useMemo(() => {
    const layerMap = new Map(layers.map((l) => [l.id, l]));
    return nodesFromStore.map((node) => {
      const layerId = nodeLayerId[node.id] ?? "default";
      const layer = layerMap.get(layerId);
      const hidden = layer ? !layer.visible : false;
      return { ...node, hidden };
    });
  }, [nodesFromStore, layers, nodeLayerId]);

  const freehandHandlers = useFreehandDraw({
    clientToFlowRef: flowPositionRef,
    onStrokeEnd: onFreehandStrokeEnd ?? (() => {}),
    enabled: isFreehandActive,
  });

  const edgesWithLayerVisibility = useMemo(() => {
    const hiddenNodeIds = new Set(
      nodesWithLayerVisibility.filter((n) => n.hidden).map((n) => n.id)
    );
    return edgesFromStore.filter(
      (e) => !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target)
    );
  }, [edgesFromStore, nodesWithLayerVisibility]);

  const setNodes = useBoardStore((s) => s.setNodes);
  const addOrUpdateTask = useBoardStore((s) => s.addOrUpdateTask);
  const removeTask = useBoardStore((s) => s.removeTask);
  const lastCursorSent = useRef(0);

  const handlePaneMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!sendCursor || Date.now() - lastCursorSent.current < CURSOR_THROTTLE_MS) return;
      const flowPos = flowPositionRef?.current?.({ x: event.clientX, y: event.clientY });
      if (flowPos) {
        lastCursorSent.current = Date.now();
        sendCursor(flowPos);
      }
    },
    [sendCursor, flowPositionRef]
  );

  const setEdges = useBoardStore((s) => s.setEdges);
  const { handlePaneClick, handleNodeDragStop, handleConnect } = useBoardCanvas({
    projectId,
    onCanvasClick,
    onConnectorEnd,
    addOrUpdateTask,
    removeTask,
    setNodes,
    flowPositionRef,
  });

  const onNodesChangeWithStore = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) => {
      setNodes((prev) => applyNodeChanges(changes, prev));
    },
    [setNodes]
  );

  const onEdgesChangeWithStore = useCallback(
    (changes: Parameters<typeof applyEdgeChanges>[0]) => {
      setEdges((prev) => applyEdgeChanges(changes, prev));
    },
    [setEdges]
  );

  const onConnectHandler: OnConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        handleConnect(params.source, params.target);
      }
    },
    [handleConnect]
  );

  const isCreateToolActive = isCreateTool(activeTool);

  const paneClickHandler = isCreateToolActive && !isFreehandActive ? handlePaneClick : undefined;

  const handleViewportChange = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      if (!onViewportChange) return;
      const el = paneRef.current;
      const width = el?.offsetWidth ?? 0;
      const height = el?.offsetHeight ?? 0;
      if (width > 0 && height > 0) {
        onViewportChange(viewport, { width, height });
      }
    },
    [onViewportChange]
  );

  return (
    <div ref={paneRef} className="h-full w-full">
    <ReactFlow
      nodes={nodesWithLayerVisibility}
      edges={edgesWithLayerVisibility}
      onNodesChange={onNodesChangeWithStore}
      onEdgesChange={onEdgesChangeWithStore}
      onConnect={isConnectTool(activeTool) ? onConnectHandler : undefined}
      onPaneClick={paneClickHandler}
      onPaneMouseMove={handlePaneMouseMove}
      onViewportChange={handleViewportChange}
      onNodeDragStop={handleNodeDragStop}
      onNodeContextMenu={onNodeContextMenu}
      onEdgeContextMenu={onEdgeContextMenu}
      onDelete={
        onDelete
          ? ({ nodes: nodesToDelete, edges: edgesToDelete }) => {
              onDelete({
                nodeIds: nodesToDelete.map((n) => n.id),
                edgeIds: edgesToDelete.map((e) => e.id),
              });
            }
          : undefined
      }
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{ type: "smoothstep" }}
      connectionMode={ConnectionMode.Loose}
      panOnDrag={activeTool === "select" || activeTool === "pan"}
      paneClickDistance={8}
      nodesDraggable={activeTool === "select"}
      nodesConnectable={isConnectTool(activeTool)}
      elementsSelectable={activeTool === "select"}
      proOptions={{ hideAttribution: true }}
    >
      {isFreehandActive && (
        <FreehandOverlay
          currentStroke={freehandHandlers.currentStroke}
          onPointerDown={freehandHandlers.handlePointerDown}
          onPointerMove={freehandHandlers.handlePointerMove}
          onPointerUp={freehandHandlers.handlePointerUp}
        />
      )}
      <FlowPositionRefSetterPanel refProp={flowPositionRef} />
      <CursorOverlay />
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="var(--border)"
        bgColor="var(--background)"
      />
      <Controls />
      {showMinimap && <MiniMap pannable zoomable />}
    </ReactFlow>
    </div>
  );
}
