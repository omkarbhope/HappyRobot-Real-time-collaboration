"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export type FreehandNodeData = {
  taskId: string;
  pathD: string;
  width: number;
  height: number;
};

function FreehandNodeComponent(props: NodeProps) {
  const data = props.data as FreehandNodeData;
  const width = data?.width ?? 100;
  const height = data?.height ?? 100;
  const pathD = data?.pathD ?? "";

  return (
    <>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-2" />
      <div
        className="overflow-visible"
        style={{ width, height }}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          <path
            d={pathD}
            fill="hsl(var(--primary) / 0.15)"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
        </svg>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-2" />
    </>
  );
}

export const FreehandNode = memo(FreehandNodeComponent);
