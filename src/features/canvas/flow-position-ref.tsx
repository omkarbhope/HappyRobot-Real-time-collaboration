"use client";

import { useRef } from "react";
import { Panel, useReactFlow } from "@xyflow/react";

type ScreenToFlow = (position: { x: number; y: number }) => { x: number; y: number };

function FlowPositionRefSetter({ refProp }: { refProp: React.MutableRefObject<ScreenToFlow | null> }) {
  const { screenToFlowPosition } = useReactFlow();
  refProp.current = screenToFlowPosition;
  return null;
}

export function useFlowPositionRef() {
  return useRef<ScreenToFlow | null>(null);
}

export function FlowPositionRefSetterPanel({ refProp }: { refProp: React.MutableRefObject<ScreenToFlow | null> }) {
  return (
    <Panel position="top-left" style={{ pointerEvents: "none" }}>
      <FlowPositionRefSetter refProp={refProp} />
    </Panel>
  );
}
