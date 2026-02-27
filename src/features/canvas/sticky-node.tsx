"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/features/board/board-store";
import { CommentPin } from "@/features/comments/comment-pin";

export type StickyNodeData = {
  label: string;
  taskId: string;
  width?: number;
  height?: number;
  contentHtml?: string | null;
  fill?: string;
};

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const STICKY_COLORS = ["#fef3c7", "#fce7f3", "#dbeafe", "#d1fae5", "#fed7aa", "#e9d5ff", "#fef9c3", "#ddd6fe"];

function StickyNodeComponent(props: NodeProps) {
  const data = props.data as StickyNodeData;
  const [editing, setEditing] = useState(false);
  const displayText =
    data?.label ?? (data?.contentHtml != null ? stripHtml(data.contentHtml) : "") ?? "";
  const [value, setValue] = useState(displayText);
  const width = data?.width ?? 200;
  const height = data?.height ?? 120;
  const fillColor = (data as { fill?: string }).fill ?? "#fef3c7";
  const focusStickyId = useBoardStore((s) => s.focusStickyId);
  const setFocusStickyId = useBoardStore((s) => s.setFocusStickyId);
  const nodes = useBoardStore((s) => s.nodes);
  const currentNode = nodes.find((n) => n.id === props.id);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isDirtyRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const setNodes = useBoardStore((s) => s.setNodes);

  const setStickyColor = useCallback(
    (color: string) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === props.id ? { ...node, data: { ...node.data, fill: color } } : node
        )
      );
      const win = window as unknown as { __onFormatChange?: (nodeIds: string[], key: string, value: string) => void };
      win.__onFormatChange?.([props.id], "fill", color);
    },
    [props.id, setNodes]
  );

  const positionForSave = (): { x: number; y: number } => {
    if (typeof props.positionAbsoluteX === "number" && typeof props.positionAbsoluteY === "number") {
      return { x: props.positionAbsoluteX, y: props.positionAbsoluteY };
    }
    const p = currentNode?.position ?? { x: 0, y: 0 };
    return { x: p.x, y: p.y };
  };
  const sizeForSave = () => ({ w: width, h: height });

  useEffect(() => {
    setValue(displayText);
  }, [displayText]);

  useEffect(() => {
    if (focusStickyId === props.id) {
      setEditing(true);
      setFocusStickyId(null);
    }
  }, [focusStickyId, props.id, setFocusStickyId]);

  const flushSave = useCallback(
    (title: string, contentHtml: string) => {
      const win = window as unknown as {
        __onStickySave?: (
          id: string,
          title: string,
          contentHtml?: string,
          position?: { x: number; y: number },
          size?: { w: number; h: number },
          customFields?: Record<string, unknown>
        ) => void;
      };
      const customFields: Record<string, unknown> = {};
      if (data?.fill != null) customFields.fill = data.fill;
      if ((data as Record<string, unknown>)?.stroke != null) customFields.stroke = (data as Record<string, unknown>).stroke;
      win.__onStickySave?.(data?.taskId ?? props.id, title, contentHtml, positionForSave(), sizeForSave(), Object.keys(customFields).length > 0 ? customFields : undefined);
      isDirtyRef.current = false;
    },
    [data?.taskId, props.id, data?.fill, (data as { stroke?: unknown })?.stroke]
  );

  const handleBlur = () => {
    setEditing(false);
    const title = valueRef.current.trim() || "New note";
    setValue(title);
    valueRef.current = title;
    const contentHtml = `<p>${title.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`;
    flushSave(title, contentHtml);
  };

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    return () => {
      if (isDirtyRef.current && valueRef.current.trim()) {
        const title = valueRef.current.trim();
        flushSave(title, `<p>${title.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`);
      }
    };
  }, [flushSave]);

  const handleResizeEnd = (_: unknown, params: { width: number; height: number }) => {
    const win = window as unknown as { __onStickyResize?: (id: string, w: number, h: number) => void };
    win.__onStickyResize?.(data?.taskId ?? props.id, Math.round(params.width), Math.round(params.height));
  };

  return (
    <>
      <NodeResizer
        minWidth={80}
        minHeight={40}
        isVisible={props.selected}
        onResizeEnd={handleResizeEnd}
        lineStyle={{ opacity: 0 }}
      />
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-2" />
      <div
        className={cn(
          "relative rounded-lg border-2 border-amber-200/80 p-2 shadow-md dark:border-amber-700/50",
          props.selected && "ring-2 ring-primary"
        )}
        style={{ width, height, minHeight: 40, backgroundColor: fillColor }}
        onDoubleClick={() => setEditing(true)}
      >
        <CommentPin taskId={props.id} />
        {props.selected && (
          <div className="mb-1.5 flex flex-wrap gap-0.5 border-b border-amber-300/50 pb-1.5 dark:border-amber-600/30">
            {STICKY_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "size-5 rounded border border-amber-300/80 dark:border-amber-600/50",
                  fillColor === color && "ring-2 ring-amber-600 dark:ring-amber-400"
                )}
                style={{ backgroundColor: color }}
                onClick={(e) => {
                  e.stopPropagation();
                  setStickyColor(color);
                }}
                title="Sticky color"
              />
            ))}
          </div>
        )}
        {editing ? (
          <textarea
            ref={textareaRef}
            className="min-h-[60px] flex-1 resize-none overflow-auto border-0 bg-transparent p-0 text-sm outline-none"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              valueRef.current = e.target.value;
              isDirtyRef.current = true;
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
            }}
          />
        ) : data?.contentHtml != null && /<(b|strong|i|em|u|ul|ol|li)>/i.test(data.contentHtml) ? (
          <div
            className="prose prose-sm max-w-none break-words text-sm dark:prose-invert [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0"
            dangerouslySetInnerHTML={{ __html: data.contentHtml }}
          />
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm">{value || "Double-click to edit"}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-2" />
    </>
  );
}

export const StickyNode = memo(StickyNodeComponent);
