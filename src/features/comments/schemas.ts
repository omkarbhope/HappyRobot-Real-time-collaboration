import { z } from "zod";
import { MAX_COMMENT_LENGTH } from "@/shared/constants";

export const CreateCommentSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1).max(MAX_COMMENT_LENGTH),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  mentionUserIds: z.array(z.string().min(1)).optional(),
});

export const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(MAX_COMMENT_LENGTH).optional(),
  resolved: z.boolean().optional(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
