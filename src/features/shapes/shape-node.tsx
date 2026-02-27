"use client";

import { memo, useRef, useState, useCallback, useEffect } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/features/board/board-store";
import { CommentPin } from "@/features/comments/comment-pin";

export type ShapeNodeData = {
  taskId: string;
  shape:
    | "rectangle"
    | "circle"
    | "arrow"
    | "diamond"
    | "parallelogram"
    | "triangle"
    | "roundedRectangle"
    | "document"
    | "ellipse"
    | "line";
  width?: number;
  height?: number;
  rotation?: number;
};

function ShapeNodeComponent(props: NodeProps) {
  const data = props.data as ShapeNodeData;
  const width = data?.width ?? 120;
  const height = data?.height ?? 80;
  const shape = data?.shape ?? "rectangle";
  const setNodes = useBoardStore((s) => s.setNodes);
  const containerRef = useRef<HTMLDivElement>(null);
  const rotateHandleRef = useRef<HTMLElement | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const startRotationRef = useRef(0);
  const startAngleRef = useRef(0);
  /** Track previous angle/rotation each move so we can accumulate past 180° (no wall). */
  const previousAngleRef = useRef(0);
  const previousRotationRef = useRef(0);

  const getAngleDeg = useCallback((rect: DOMRect, clientX: number, clientY: number) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - centerY, clientX - centerX);
    return (rad * 180) / Math.PI;
  }, []);

  /** Normalize angle delta to shortest path (-180, 180] so crossing atan2's ±180° boundary doesn't flip. */
  const normalizeAngleDelta = useCallback((delta: number) => {
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return delta;
  }, []);

  const handleRotateStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      const el = containerRef.current;
      if (!el) return;
      rotateHandleRef.current = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const initialRotation = (data as { rotation?: number }).rotation ?? 0;
      const initialAngle = getAngleDeg(rect, e.clientX, e.clientY);
      startRotationRef.current = initialRotation;
      startAngleRef.current = initialAngle;
      previousAngleRef.current = initialAngle;
      previousRotationRef.current = initialRotation;
      setIsRotating(true);
      rotateHandleRef.current.setPointerCapture?.(e.pointerId);
    },
    [data, getAngleDeg]
  );

  useEffect(() => {
    if (!isRotating) return;
    const nodeId = props.id;
    const taskId = (data as { taskId?: string }).taskId ?? nodeId;

    const onMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const currentAngle = getAngleDeg(rect, e.clientX, e.clientY);
      const delta = normalizeAngleDelta(currentAngle - previousAngleRef.current);
      const newRotation = previousRotationRef.current + delta;
      previousAngleRef.current = currentAngle;
      previousRotationRef.current = newRotation;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, rotation: newRotation } } : n
        )
      );
    };
    const onUp = (e: PointerEvent) => {
      const handle = rotateHandleRef.current;
      if (handle?.releasePointerCapture) {
        try {
          handle.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
      const finalRotation = previousRotationRef.current;
      const newRotation = Math.round(((finalRotation % 360) + 360) % 360);
      const win = window as unknown as {
        __onFormatChange?: (nodeIds: string[], key: string, value: string) => void;
      };
      win.__onFormatChange?.([taskId], "rotation", String(newRotation));
      setIsRotating(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isRotating, props.id, data, getAngleDeg, normalizeAngleDelta, setNodes]);

  const handleResizeEnd = (_: unknown, params: { width: number; height: number }) => {
    const win = window as unknown as { __onShapeResize?: (id: string, w: number, h: number, shapeType: string) => void };
    win.__onShapeResize?.(data?.taskId ?? props.id, Math.round(params.width), Math.round(params.height), shape);
  };

  const baseClass = "border-2 border-border bg-muted/70";
  const selectedClass = props.selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "";
  const fillStyle = (data as { fill?: string }).fill;
  const strokeStyle = (data as { stroke?: string }).stroke;
  const rotation = (data as { rotation?: number }).rotation ?? 0;
  const style = {
    width,
    height,
    ...(fillStyle && { backgroundColor: fillStyle }),
    ...(strokeStyle && { borderColor: strokeStyle }),
    ...(shape === "circle" && { border: "none", background: "transparent" }),
    ...(shape === "ellipse" && { border: "none", background: "transparent" }),
    ...(shape === "line" && { border: "none", background: "transparent" }),
  };
  const innerTransform = rotation ? { transform: `rotate(${rotation}deg)` } : undefined;

  return (
    <>
      <NodeResizer
        minWidth={40}
        minHeight={40}
        isVisible={props.selected}
        onResizeEnd={handleResizeEnd}
        lineStyle={{ opacity: 0 }}
        color="var(--muted-foreground)"
      />
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-2" />
      <div ref={containerRef} className="relative" style={{ width, height }}>
        <CommentPin taskId={props.id} />
        <div
          className={cn(baseClass, selectedClass)}
          style={style}
        >
          <div className="h-full w-full" style={innerTransform}>
        {shape === "rectangle" && (
          <div className="h-full w-full rounded-sm" style={{ width, height }} />
        )}
        {shape === "circle" && (
          <svg width={width} height={height} className="overflow-visible block">
            <circle
              cx={width / 2}
              cy={height / 2}
              r={Math.min(width, height) / 2 - 2}
              fill={fillStyle ?? "var(--muted)"}
              stroke={strokeStyle ?? "var(--border)"}
              strokeWidth={2}
            />
          </svg>
        )}
        {shape === "arrow" && (
          <svg width={width} height={height} className="overflow-visible">
            <defs>
              <marker
                id={`arrowhead-${props.id}`}
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
              </marker>
            </defs>
            <line
              x1={8}
              y1={height / 2}
              x2={width - 8}
              y2={height / 2}
              stroke="currentColor"
              strokeWidth="2"
              markerEnd={`url(#arrowhead-${props.id})`}
            />
          </svg>
        )}
        {shape === "diamond" && (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <polygon
              points={`${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`}
              fill="hsl(var(--primary) / 0.05)"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          </svg>
        )}
        {shape === "parallelogram" && (
          <div
            className="h-full w-full"
            style={{
              clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)",
              backgroundColor: "hsl(var(--primary) / 0.05)",
              border: "2px solid hsl(var(--primary))",
            }}
          />
        )}
        {shape === "triangle" && (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <polygon
              points={`${width / 2},0 ${width},${height} 0,${height}`}
              fill="hsl(var(--primary) / 0.05)"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          </svg>
        )}
        {shape === "roundedRectangle" && (
          <div className="h-full w-full rounded-lg border-2 border-primary bg-primary/5" style={{ width, height }} />
        )}
        {shape === "document" && (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <path
              d={`M 0 0 L ${width - 12} 0 L ${width} 12 L ${width} ${height} L 0 ${height} Z M ${width - 12} 0 L ${width - 12} 12 L ${width} 12`}
              fill="hsl(var(--primary) / 0.05)"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          </svg>
        )}
        {shape === "ellipse" && (
          <svg width={width} height={height} className="overflow-visible block">
            <ellipse
              cx={width / 2}
              cy={height / 2}
              rx={width / 2 - 2}
              ry={height / 2 - 2}
              fill={fillStyle ?? "var(--muted)"}
              stroke={strokeStyle ?? "var(--border)"}
              strokeWidth={2}
            />
          </svg>
        )}
        {shape === "line" && (
          <svg width={width} height={height} className="overflow-visible block">
            <line
              x1={0}
              y1={height / 2}
              x2={width}
              y2={height / 2}
              stroke={strokeStyle ?? "var(--border)"}
              strokeWidth={2}
            />
          </svg>
        )}
        </div>
      </div>
      {props.selected && (
        <div
          ref={rotateHandleRef}
          role="button"
          tabIndex={0}
          className="nodrag absolute right-0 top-0 z-10 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-muted-foreground bg-background cursor-grab hover:bg-muted active:cursor-grabbing"
          onPointerDown={handleRotateStart}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
          }}
          title="Rotate"
          aria-label="Rotate shape"
        />
      )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-2" />
    </>
  );
}

export const ShapeNode = memo(ShapeNodeComponent);
