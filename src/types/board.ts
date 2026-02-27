/** Shapes matching API responses and Prisma models for board UI */
import type { AllowedTaskType } from "@/features/board/tool-registry";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskConfiguration {
  type?: AllowedTaskType;
  position?: { x: number; y: number };
  size?: { w: number; h: number };
  priority?: number;
  description?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  contentHtml?: string | null;
  layerId?: string;
  rotation?: number;
}

export interface Task {
  id: string;
  projectId: string;
  parentId?: string | null;
  title: string;
  status: string;
  assignedTo: unknown;
  configuration: TaskConfiguration | null;
  dependencies: string[] | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

export interface Comment {
  id: string;
  taskId: string;
  content: string;
  authorId: string;
  resolved?: boolean;
  positionX?: number | null;
  positionY?: number | null;
  mentionUserIds?: string[] | null;
  createdAt: string;
  updatedAt: string;
  author?: CommentAuthor;
}

export interface InviteCode {
  id: string;
  projectId: string;
  code: string;
  createdById: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface BoardEventUser {
  id: string;
  name: string | null;
  image: string | null;
}

export interface BoardEvent {
  id: string;
  boardId: string;
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  userId: string;
  createdAt: string;
  user?: BoardEventUser;
}

export interface TaskListResponse {
  items: Task[];
  nextCursor: string | null;
}

export interface JoinByCodeResult {
  project: Project;
  alreadyMember: boolean;
}

export type PresenceUser = {
  userId: string;
  name: string | null;
  image: string | null;
};
