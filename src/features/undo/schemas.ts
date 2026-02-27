import { z } from "zod";

export const UndoSchema = z.object({
  eventId: z.string().min(1),
});

export type UndoInput = z.infer<typeof UndoSchema>;
