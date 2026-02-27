"use client";

import { useBoardStore } from "@/features/board/board-store";
import { cn } from "@/lib/utils";

const PRESET_FILLS = ["hsl(var(--primary) / 0.05)", "hsl(var(--background))", "#fef3c7", "#dbeafe", "#d1fae5", "#fce7f3"];
const PRESET_STROKES = ["hsl(var(--primary))", "#000", "#374151", "#1e40af", "#15803d"];
const STICKY_COLORS = ["#fef3c7", "#fce7f3", "#dbeafe", "#d1fae5", "#fed7aa", "#e9d5ff", "#fef9c3", "#ddd6fe"];

export function FormatPanel() {
  const nodes = useBoardStore((s) => s.nodes);
  const setNodes = useBoardStore((s) => s.setNodes);
  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedNodeIds = selectedNodes.map((n) => n.id);

  if (selectedNodeIds.length === 0) return null;

  const updateFormat = (key: "fill" | "stroke" | "rotation", value: string) => {
    setNodes((prev) =>
      prev.map((node) =>
        selectedNodeIds.includes(node.id)
          ? {
              ...node,
              data: {
                ...node.data,
                [key]: key === "rotation" ? parseFloat(value) : value,
              },
            }
          : node
      )
    );
    const win = window as unknown as { __onFormatChange?: (nodeIds: string[], key: string, value: string) => void };
    win.__onFormatChange?.(selectedNodeIds, key, value);
  };

  const isShapeSelection = selectedNodes.every((n) => n.type === "shape");
  const isStickySelection = selectedNodes.length > 0 && selectedNodes.every((n) => n.type === "sticky");
  const rotation =
    selectedNodes.length === 1 && selectedNodes[0].type === "shape"
      ? (selectedNodes[0].data as { rotation?: number }).rotation ?? 0
      : 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/95 p-2 shadow-md backdrop-blur min-w-[140px]">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Format</p>
      {isStickySelection ? (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Sticky color</p>
          <div className="flex flex-wrap gap-1">
            {STICKY_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn("size-6 rounded border border-border")}
                style={{ backgroundColor: color }}
                onClick={() => updateFormat("fill", color)}
                title={color}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Fill</p>
            <div className="flex flex-wrap gap-1">
              {PRESET_FILLS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn("size-6 rounded border border-border")}
                  style={{ backgroundColor: color }}
                  onClick={() => updateFormat("fill", color)}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Stroke</p>
            <div className="flex flex-wrap gap-1">
              {PRESET_STROKES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn("size-6 rounded border border-border")}
                  style={{ backgroundColor: color }}
                  onClick={() => updateFormat("stroke", color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </>
      )}
      {isShapeSelection && selectedNodes.length === 1 && (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Rotation</p>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={360}
              step={15}
              value={Math.round(rotation)}
              onChange={(e) => updateFormat("rotation", e.target.value)}
              className="flex-1"
            />
            <span className="w-8 text-xs tabular-nums">{Math.round(rotation)}°</span>
          </div>
        </div>
      )}
    </div>
  );
}
