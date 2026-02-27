"use client";

import { memo, useState, useEffect, useRef } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/features/board/board-store";
import { CommentPin } from "@/features/comments/comment-pin";

export type TextNodeData = {
  label: string;
  taskId: string;
  width?: number;
  height?: number;
  contentHtml?: string | null;
};

function TextNodeComponent(props: NodeProps) {
  const data = props.data as TextNodeData;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data?.label ?? "Text");
  const width = data?.width ?? 200;
  const height = data?.height ?? 40;
  const nodes = useBoardStore((s) => s.nodes);
  const currentNode = nodes.find((n) => n.id === props.id);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** Only save on unmount if user changed content and didn't blur (avoids PATCH on Strict Mode unmount). */
  const isDirtyRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const positionForSave = (): { x: number; y: number } => {
    if (typeof props.positionAbsoluteX === "number" && typeof props.positionAbsoluteY === "number") {
      return { x: props.positionAbsoluteX, y: props.positionAbsoluteY };
    }
    const p = currentNode?.position ?? { x: 0, y: 0 };
    return { x: p.x, y: p.y };
  };
  const sizeForSave = () => ({ w: width, h: height });

  useEffect(() => {
    setValue(data?.label ?? "Text");
  }, [data?.label]);

  const flushSave = () => {
    const win = window as unknown as {
      __onTextSave?: (id: string, title: string, position?: { x: number; y: number }, size?: { w: number; h: number }) => void;
    };
    win.__onTextSave?.(data?.taskId ?? props.id, valueRef.current.trim() || "Text", positionForSave(), sizeForSave());
    isDirtyRef.current = false;
  };

  const handleBlur = () => {
    setEditing(false);
    flushSave();
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    return () => {
      if (isDirtyRef.current && valueRef.current.trim()) flushSave();
    };
  }, []);

  const handleResizeEnd = (_: unknown, params: { width: number; height: number }) => {
    const win = window as unknown as { __onTextResize?: (id: string, w: number, h: number) => void };
    win.__onTextResize?.(data?.taskId ?? props.id, Math.round(params.width), Math.round(params.height));
  };

  return (
    <>
      <NodeResizer
        minWidth={60}
        minHeight={24}
        isVisible={props.selected}
        onResizeEnd={handleResizeEnd}
        lineStyle={{ opacity: 0 }}
      />
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-2" />
      <div
        className={cn(
          "relative rounded border bg-background px-2 py-1 shadow-sm",
          props.selected && "ring-2 ring-primary"
        )}
        style={{ width, height, minHeight: 24 }}
        onDoubleClick={() => setEditing(true)}
      >
        <CommentPin taskId={props.id} />
        {editing ? (
          <textarea
            ref={inputRef}
            className="h-full w-full resize-none border-0 bg-transparent p-0 text-sm outline-none"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              isDirtyRef.current = true;
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
          />
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">{value || "Double-click to edit"}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-2" />
    </>
  );
}

export const TextNode = memo(TextNodeComponent);
