import { z } from "zod";
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/shared/constants";

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
