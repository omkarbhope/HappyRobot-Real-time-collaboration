"use client";

import { useCallback, useRef, useState } from "react";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "./freehand-utils";

export interface FreehandStrokeResult {
  pathD: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
}

type ClientToFlow = (p: { x: number; y: number }) => { x: number; y: number };

interface UseFreehandDrawProps {
  clientToFlowRef: React.MutableRefObject<ClientToFlow | null>;
  onStrokeEnd: (result: FreehandStrokeResult) => void;
  onStrokeProgress?: (result: FreehandStrokeResult) => void;
  enabled: boolean;
}

function computeStrokeFromPoints(points: number[][]): FreehandStrokeResult | null {
  if (points.length < 2) return null;
  const strokeOptions = { size: 12, thinning: 0.5, smoothing: 0.5, streamline: 0.5 };
  const outline = getStroke(points, strokeOptions);
  if (outline.length < 2) return null;
  const pathD = getSvgPathFromStroke(outline, false);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of outline) {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
  }
  const padding = 8;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  const w = Math.max(maxX - minX, 20);
  const h = Math.max(maxY - minY, 20);

  const translatedOutline = outline.map((p) => [p[0] - minX, p[1] - minY]);
  const localPathD = getSvgPathFromStroke(translatedOutline, false);

  return {
    pathD: localPathD,
    position: { x: minX, y: minY },
    size: { w: Math.round(w), h: Math.round(h) },
  };
}

export function useFreehandDraw({
  clientToFlowRef,
  onStrokeEnd,
  onStrokeProgress,
  enabled,
}: UseFreehandDrawProps) {
  const pointsRef = useRef<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<FreehandStrokeResult | null>(null);

  const getFlowPoint = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const clientToFlow = clientToFlowRef.current;
      if (!clientToFlow) return null;
      const flow = clientToFlow({ x: clientX, y: clientY });
      return [flow.x, flow.y];
    },
    [clientToFlowRef]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;
      const pt = getFlowPoint(e.clientX, e.clientY);
      if (pt) {
        pointsRef.current = [[pt[0], pt[1], e.pressure]];
        setCurrentStroke(null);
        setIsDrawing(true);
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    },
    [enabled, getFlowPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !isDrawing || pointsRef.current.length === 0) return;
      const pt = getFlowPoint(e.clientX, e.clientY);
      if (pt) {
        pointsRef.current.push([pt[0], pt[1], e.pressure]);
        const result = computeStrokeFromPoints(pointsRef.current);
        if (result) {
          setCurrentStroke(result);
          onStrokeProgress?.(result);
        }
      }
    },
    [enabled, isDrawing, getFlowPoint, onStrokeProgress]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (!isDrawing || pointsRef.current.length < 2) {
        pointsRef.current = [];
        setCurrentStroke(null);
        setIsDrawing(false);
        return;
      }
      const points = pointsRef.current;
      const strokeOptions = { size: 12, thinning: 0.5, smoothing: 0.5, streamline: 0.5 };
      const outline = getStroke(points, strokeOptions);
      const pathD = getSvgPathFromStroke(outline);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of outline) {
        minX = Math.min(minX, p[0]);
        minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]);
        maxY = Math.max(maxY, p[1]);
      }
      const padding = 8;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;
      const w = Math.max(maxX - minX, 20);
      const h = Math.max(maxY - minY, 20);

      const translatedOutline = outline.map((p) => [p[0] - minX, p[1] - minY]);
      const localPathD = getSvgPathFromStroke(translatedOutline);

      const result: FreehandStrokeResult = {
        pathD: localPathD,
        position: { x: minX, y: minY },
        size: { w: Math.round(w), h: Math.round(h) },
      };

      setCurrentStroke(null);
      onStrokeEnd(result);

      pointsRef.current = [];
      setIsDrawing(false);
    },
    [isDrawing, onStrokeEnd]
  );

  return { handlePointerDown, handlePointerMove, handlePointerUp, isDrawing, currentStroke };
}
