"use client";

import { memo } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { CommentPin } from "@/features/comments/comment-pin";

export type FrameNodeData = {
  label: string;
  taskId: string;
  width?: number;
  height?: number;
};

function FrameNodeComponent(props: NodeProps) {
  const data = props.data as FrameNodeData;
  const width = data?.width ?? 400;
  const height = data?.height ?? 300;
  const fillStyle = (data as { fill?: string }).fill;
  const strokeStyle = (data as { stroke?: string }).stroke;
  const boxStyle = { width, height, minHeight: 40, ...(fillStyle && { backgroundColor: fillStyle }), ...(strokeStyle && { borderColor: strokeStyle }) };

  const handleResizeEnd = (_: unknown, params: { width: number; height: number }) => {
    const win = window as unknown as { __onFrameResize?: (id: string, w: number, h: number) => void };
    win.__onFrameResize?.(data?.taskId ?? props.id, Math.round(params.width), Math.round(params.height));
  };

  return (
    <>
      <NodeResizer
        minWidth={100}
        minHeight={80}
        isVisible={props.selected}
        onResizeEnd={handleResizeEnd}
        lineStyle={{ opacity: 0 }}
      />
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-2" />
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed border-primary/50 bg-primary/5",
          props.selected && "ring-2 ring-primary"
        )}
        style={boxStyle}
      >
        <CommentPin taskId={props.id} />
        <p className="p-2 text-xs text-muted-foreground">{data?.label || "Frame"}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-2" />
    </>
  );
}

export const FrameNode = memo(FrameNodeComponent);
