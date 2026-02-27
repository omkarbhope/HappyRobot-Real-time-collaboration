import { z } from "zod";

export const CreateInviteCodeSchema = z.object({
  projectId: z.string().uuid(),
});

export const JoinByCodeSchema = z.object({
  code: z.string().min(1).max(32),
});

export type CreateInviteCodeInput = z.infer<typeof CreateInviteCodeSchema>;
export type JoinByCodeInput = z.infer<typeof JoinByCodeSchema>;
