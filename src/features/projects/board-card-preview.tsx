"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { Task } from "@/types/board";
import type { TaskConfiguration } from "@/types/board";
import { isShapeTaskType } from "@/features/board/tool-registry";

const PREVIEW_W = 280;
const PREVIEW_H = 140;
const PADDING = 24;

interface NodeBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
}

function getBoundsFromTask(task: Task): NodeBounds | null {
  const config = task.configuration as TaskConfiguration | null | undefined;
  const type = config?.type ?? "sticky";
  if (type === "connector") return null;

  const pos = config?.position ?? { x: 0, y: 0 };
  let w = 120;
  let h = 80;

  if (type === "frame") {
    const size = config?.size ?? { w: 400, h: 300 };
    w = size.w;
    h = size.h;
  } else if (type === "text") {
    const size = config?.size ?? { w: 200, h: 40 };
    w = size.w;
    h = size.h;
  } else if (type === "freehand") {
    const size = config?.size ?? { w: 100, h: 100 };
    w = size.w;
    h = size.h;
  } else if (isShapeTaskType(type)) {
    const size = config?.size ?? { w: 120, h: 80 };
    w = size.w;
    h = size.h;
  } else {
    const size = config?.size ?? { w: 200, h: 120 };
    w = size.w;
    h = size.h;
  }

  return { x: pos.x ?? 0, y: pos.y ?? 0, w, h, type };
}

function fitBounds(
  boxes: NodeBounds[],
  padding: number
): { minX: number; minY: number; rangeX: number; rangeY: number; scale: number } {
  if (boxes.length === 0) {
    return { minX: 0, minY: 0, rangeX: 1, rangeY: 1, scale: 1 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scaleToFit = Math.min(
    (PREVIEW_W - padding * 2) / rangeX,
    (PREVIEW_H - padding * 2) / rangeY
  );
  // Allow zooming in so content fills the preview; cap at 4x so one tiny node doesn't dominate
  const scale = Math.min(scaleToFit, 4);
  return { minX, minY, rangeX, rangeY, scale };
}

function fillForType(type: string): string {
  switch (type) {
    case "sticky":
      return "rgb(254 240 138)"; // sticky yellow
    case "frame":
      return "rgb(241 245 249)"; // slate-100
    case "text":
      return "rgb(255 255 255)";
    case "freehand":
      return "rgb(226 232 240)"; // slate-200
    default:
      return "rgb(226 232 240)"; // shapes
  }
}

function strokeForType(type: string): string {
  switch (type) {
    case "sticky":
      return "rgb(253 224 71 / 0.6)";
    case "frame":
      return "rgb(203 213 225)";
    case "text":
      return "rgb(203 213 225)";
    default:
      return "rgb(203 213 225)";
  }
}

interface BoardCardPreviewProps {
  projectId: string;
  className?: string;
}

export function BoardCardPreview({ projectId, className }: BoardCardPreviewProps) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    apiGet<{ items: Task[]; nextCursor: string | null }>(
      `/api/tasks?projectId=${encodeURIComponent(projectId)}&limit=100`
    ).then((res) => {
      if (cancelled) return;
      if (res.error || !res.data) {
        setError(true);
        setTasks([]);
      } else {
        setTasks(res.data.items ?? []);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div
        className={`flex aspect-[280/140] w-full items-center justify-center rounded-t-md bg-muted/50 ${className ?? ""}`}
      >
        <div className="h-6 w-6 animate-pulse rounded-full bg-muted-foreground/20" />
      </div>
    );
  }

  const boxes: NodeBounds[] = [];
  if (tasks) {
    for (const t of tasks) {
      const b = getBoundsFromTask(t);
      if (b) boxes.push(b);
    }
  }

  if (error || boxes.length === 0) {
    return (
      <div
        className={`flex aspect-[280/140] w-full flex-col items-center justify-center gap-1 rounded-t-md border-b border-dashed border-muted-foreground/25 bg-muted/30 text-muted-foreground ${className ?? ""}`}
      >
        <svg
          className="size-8 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
          />
        </svg>
        <span className="text-xs">No content yet</span>
      </div>
    );
  }

  const { minX, minY, rangeX, rangeY, scale } = fitBounds(boxes, PADDING);
  const scaledW = rangeX * scale;
  const scaledH = rangeY * scale;
  const offsetX = (PREVIEW_W - scaledW) / 2;
  const offsetY = (PREVIEW_H - scaledH) / 2;

  return (
    <div
      className={`aspect-[280/140] w-full overflow-hidden rounded-t-md border-b border-border bg-[var(--background)] ${className ?? ""}`}
    >
      <svg
        width="100%"
        height="100%"
        className="block"
        viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {boxes.map((b, i) => {
          const x = (b.x - minX) * scale + offsetX;
          const y = (b.y - minY) * scale + offsetY;
          const w = Math.max(4, b.w * scale);
          const h = Math.max(4, b.h * scale);
          const fill = fillForType(b.type);
          const stroke = strokeForType(b.type);
          const rx = b.type === "frame" ? 4 : b.type === "sticky" ? 2 : 0;
          return (
            <rect
              key={`${b.x}-${b.y}-${i}`}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={rx}
              ry={rx}
              fill={fill}
              stroke={stroke}
              strokeWidth={1}
            />
          );
        })}
      </svg>
    </div>
  );
}
