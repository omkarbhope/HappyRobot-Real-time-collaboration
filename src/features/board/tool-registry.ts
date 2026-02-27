/**
 * Single source of truth for canvas tools. Add new tools here; palette, canvas, and create logic derive from this.
 */

export type ToolCategory = "select" | "connect" | "create";

export interface ToolDef {
  id: string;
  label: string;
  icon: string;
  category: ToolCategory;
  nodeType?: "sticky" | "shape" | "frame" | "text" | "freehand";
  shape?: string;
  defaultSize?: { w: number; h: number };
  defaultTitle?: string;
}

export const TOOL_REGISTRY = [
  { id: "select", label: "Select / drag", icon: "MousePointer2", category: "select" as const },
  { id: "pan", label: "Pan", icon: "Hand", category: "select" as const },
  {
    id: "sticky",
    label: "Sticky note",
    icon: "StickyNote",
    category: "create" as const,
    nodeType: "sticky" as const,
    defaultSize: { w: 200, h: 120 },
    defaultTitle: "New note",
  },
  { id: "connector", label: "Connector", icon: "Link2", category: "connect" as const },
  {
    id: "frame",
    label: "Frame",
    icon: "Box",
    category: "create" as const,
    nodeType: "frame" as const,
    defaultSize: { w: 400, h: 300 },
    defaultTitle: "Frame",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    icon: "Square",
    category: "create" as const,
    nodeType: "shape" as const,
    shape: "rectangle",
    defaultSize: { w: 120, h: 80 },
    defaultTitle: "",
  },
  {
    id: "circle",
    label: "Circle",
    icon: "Circle",
    category: "create" as const,
    nodeType: "shape" as const,
    shape: "circle",
    defaultSize: { w: 80, h: 80 },
    defaultTitle: "",
  },
  {
    id: "arrow",
    label: "Arrow",
    icon: "ArrowRight",
    category: "create" as const,
    nodeType: "shape" as const,
    shape: "arrow",
    defaultSize: { w: 120, h: 40 },
    defaultTitle: "",
  },
  {
    id: "diamond",
    label: "Diamond",
    icon: "Diamond",
    category: "create" as const,
    nodeType: "shape" as const,
    shape: "diamond",
    defaultSize: { w: 100, h: 80 },
    defaultTitle: "",
  },
  {
    id: "parallelogram",
    label: "Parallelogram",
    icon: "BoxSelect",
    category: "create" as const,
    nodeType: "shape" as const,
    shape: "parallelogram",
    defaultSize: { w: 120, h: 60 },
    defaultTitle: "",
  },
  {
    id: "triangle",
    label: "Triangle",
    icon: "Triangle",
    category: "create" as const,
    nodeType: "shape" as const,
    shape: "triangle",
    defaultSize: { w: 80, h: 70 },
    defaultTitle: "",
  },
  {
    id: "roundedRectangle",
    label: "Rounded rectangle",
    icon: "Square",
    category: "create" as const,
    nodeType: "shape" as const,
    shape: "roundedRectangle",
    defaultSize: { w: 120, h: 80 },
    defaultTitle: "",
  },
  {
    id: "document",
    label: "Document",
    icon: "FileText",
    category: "create" as const,
    nodeType: "shape" as const,
    shape: "document",
    defaultSize: { w: 100, h: 120 },
    defaultTitle: "",
  },
  {
    id: "ellipse",
    label: "Ellipse",
    icon: "Circle",
    category: "create" as const,
    nodeType: "shape" as const,
    shape: "ellipse",
    defaultSize: { w: 100, h: 60 },
    defaultTitle: "",
  },
  {
    id: "line",
    label: "Line",
    icon: "Minus",
    category: "create" as const,
    nodeType: "shape" as const,
    shape: "line",
    defaultSize: { w: 120, h: 4 },
    defaultTitle: "",
  },
  {
    id: "text",
    label: "Text",
    icon: "Type",
    category: "create" as const,
    nodeType: "text" as const,
    defaultSize: { w: 200, h: 40 },
    defaultTitle: "Text",
  },
  {
    id: "freehand",
    label: "Freehand",
    icon: "Pen",
    category: "create" as const,
    nodeType: "freehand" as const,
    defaultSize: { w: 100, h: 100 },
    defaultTitle: "",
  },
] as const;

export type Tool = (typeof TOOL_REGISTRY)[number]["id"];

export function getToolDef(id: string): (typeof TOOL_REGISTRY)[number] | undefined {
  return TOOL_REGISTRY.find((t) => t.id === id);
}

export function getToolIds(): readonly Tool[] {
  return TOOL_REGISTRY.map((t) => t.id);
}

export function getCreateTools(): readonly (typeof TOOL_REGISTRY)[number][] {
  return TOOL_REGISTRY.filter((t) => t.category === "create");
}

export function isCreateTool(id: string): boolean {
  const def = getToolDef(id);
  return def?.category === "create";
}

export function isConnectTool(id: string): boolean {
  const def = getToolDef(id);
  return def?.category === "connect";
}

/** Task configuration.type values allowed by backend (create tool ids + connector). */
export const ALLOWED_TASK_TYPES = [
  "connector",
  ...getCreateTools().map((t) => t.id),
] as const;

export type AllowedTaskType = (typeof ALLOWED_TASK_TYPES)[number];

const SHAPE_TOOL_IDS = new Set(
  (TOOL_REGISTRY.filter((t) => "nodeType" in t && t.nodeType === "shape") as Array<{ id: string }>).map((t) => t.id)
);

export function isShapeTaskType(type: string): boolean {
  return SHAPE_TOOL_IDS.has(type);
}

export function getDefaultActiveTool(): Tool {
  const sticky = TOOL_REGISTRY.find((t) => t.id === "sticky");
  return sticky ? (sticky.id as Tool) : (TOOL_REGISTRY[0].id as Tool);
}

/** Derive task configuration.type from a React Flow node (for drag-end, copy-paste). */
export function getTaskTypeFromNode(node: { type?: string | null; data?: Record<string, unknown> }): string {
  if (node.type === "frame") return "frame";
  if (node.type === "text") return "text";
  if (node.type === "freehand") return "freehand";
  if (node.type === "shape") return (node.data?.shape as string) ?? "rectangle";
  return "sticky";
}
