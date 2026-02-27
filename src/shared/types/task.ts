import type { AllowedTaskType } from "@/features/board/tool-registry";

export interface TaskConfiguration {
  priority?: number;
  description?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  position?: { x: number; y: number };
  size?: { w: number; h: number };
  type?: AllowedTaskType;
  contentHtml?: string | null;
}

export interface TaskDto {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  status: string;
  assignedTo: string[] | null;
  configuration: TaskConfiguration | null;
  dependencies: string[] | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}
