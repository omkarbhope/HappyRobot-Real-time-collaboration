"use client";

import { useViewport } from "@xyflow/react";
import type { FreehandStrokeResult } from "./use-freehand-draw";

interface FreehandOverlayProps {
  currentStroke: FreehandStrokeResult | null;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

/**
 * Renders the freehand capture overlay and the live stroke preview on top.
 * Uses useViewport so the preview path (in flow coords) is transformed to screen and visible while drawing.
 */
export function FreehandOverlay({
  currentStroke,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: FreehandOverlayProps) {
  const { x, y, zoom } = useViewport();

  return (
    <div
      className="absolute inset-0 z-10 cursor-crosshair"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {currentStroke && currentStroke.pathD ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ overflow: "visible" }}
        >
          <g
            transform={`translate(${x}, ${y}) scale(${zoom}) translate(${currentStroke.position.x}, ${currentStroke.position.y})`}
          >
            <path
              d={currentStroke.pathD}
              fill="hsl(var(--primary) / 0.15)"
              stroke="hsl(var(--primary))"
              strokeWidth={2 / zoom}
            />
          </g>
        </svg>
      ) : null}
    </div>
  );
}
