"use client";

import { Button } from "@/components/ui/button";
import { useBoardStore } from "./board-store";
import { TOOL_REGISTRY, type Tool, type ToolCategory } from "./tool-registry";
import { MousePointer2, StickyNote, Link2, Square, Circle, ArrowRight, Box, Diamond, BoxSelect, Triangle, FileText, Minus, Type, Pen, Hand } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const iconByName: Record<string, React.ComponentType<{ className?: string }>> = {
  MousePointer2,
  StickyNote,
  Link2,
  Square,
  Circle,
  ArrowRight,
  Box,
  Diamond,
  BoxSelect,
  Triangle,
  FileText,
  Minus,
  Type,
  Pen,
  Hand,
};

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  select: "Select",
  connect: "Connect",
  create: "Create",
};

function ToolButton({
  tool,
  activeTool,
  onSelect,
}: {
  tool: (typeof TOOL_REGISTRY)[number];
  activeTool: Tool;
  onSelect: (id: Tool) => void;
}) {
  const Icon = iconByName[tool.icon];
  return (
    <Tooltip key={tool.id}>
      <TooltipTrigger asChild>
        <Button
          variant={activeTool === tool.id ? "secondary" : "ghost"}
          size="icon"
          className="size-9 shrink-0"
          onClick={() => onSelect(tool.id as Tool)}
        >
          {Icon ? <Icon className="size-4" /> : tool.icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{tool.label}</TooltipContent>
    </Tooltip>
  );
}

export function ToolPalette() {
  const activeTool = useBoardStore((s) => s.activeTool);
  const setActiveTool = useBoardStore((s) => s.setActiveTool);

  const byCategory = TOOL_REGISTRY.reduce(
    (acc, tool) => {
      const cat = tool.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(tool);
      return acc;
    },
    {} as Record<ToolCategory, (typeof TOOL_REGISTRY)[number][]>
  );

  const order: ToolCategory[] = ["select", "connect", "create"];

  return (
    <div className="flex max-h-[min(80vh,800px)] flex-col gap-0 overflow-hidden rounded-lg border border-border bg-background/95 shadow-md backdrop-blur">
      <div className="shrink-0 px-2 py-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Tools
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-1.5 pt-0">
        {order.map((cat) => {
          const tools = byCategory[cat];
          if (!tools?.length) return null;
          return (
            <div key={cat} className="flex flex-col gap-1">
              <p className="px-1 text-[10px] font-medium text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {tools.map((t) => (
                  <ToolButton
                    key={t.id}
                    tool={t}
                    activeTool={activeTool}
                    onSelect={setActiveTool}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
