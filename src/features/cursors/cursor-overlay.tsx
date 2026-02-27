"use client";

import { useReactFlow } from "@xyflow/react";
import { useBoardStore } from "@/features/board/board-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function CursorOverlay() {
  const { flowToScreenPosition } = useReactFlow();
  const cursors = useBoardStore((s) => s.cursors);

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      {Object.entries(cursors).map(([userId, state]) => {
        const screen = flowToScreenPosition({ x: state.x, y: state.y });
        return (
          <div
            key={userId}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-background/90 px-1.5 py-0.5 shadow-sm ring-1 ring-border"
            style={{ left: screen.x, top: screen.y }}
          >
            <Avatar className="size-5">
              <AvatarImage src={state.image ?? undefined} alt="" />
              <AvatarFallback className="text-[10px]">
                {state.name?.slice(0, 2).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            {state.name && (
              <span className="max-w-[120px] truncate text-xs text-foreground">{state.name}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
