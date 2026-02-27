import { z } from "zod";
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_CONTENT_HTML_LENGTH } from "@/shared/constants";
import { ALLOWED_TASK_TYPES, type AllowedTaskType } from "@/features/board/tool-registry";

const taskConfigurationSchema = z.object({
  priority: z.number().optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  size: z.object({ w: z.number(), h: z.number() }).optional(),
  type: z.enum(ALLOWED_TASK_TYPES as [AllowedTaskType, ...AllowedTaskType[]]).optional(),
  contentHtml: z.string().max(MAX_CONTENT_HTML_LENGTH).optional().nullable(),
  pathD: z.string().optional(),
  layerId: z.string().optional(),
  rotation: z.number().optional(),
});

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  title: z.string().max(MAX_TITLE_LENGTH), // empty allowed for shapes/connectors
  status: z.string().default("open"),
  assignedTo: z.array(z.string()).optional().nullable(),
  configuration: taskConfigurationSchema.optional().nullable(),
  dependencies: z.array(z.string().uuid()).optional().nullable(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
  status: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
  assignedTo: z.array(z.string()).optional().nullable(),
  configuration: taskConfigurationSchema.optional().nullable(),
  dependencies: z.array(z.string().uuid()).optional().nullable(),
});

const BulkUpdateItemSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
  status: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
  assignedTo: z.array(z.string()).optional().nullable(),
  configuration: taskConfigurationSchema.optional().nullable(),
  dependencies: z.array(z.string().uuid()).optional().nullable(),
});

export const BulkUpdateTaskSchema = z.object({
  updates: z.array(BulkUpdateItemSchema).min(1).max(100),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type BulkUpdateTaskInput = z.infer<typeof BulkUpdateTaskSchema>;
