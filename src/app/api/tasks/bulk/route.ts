import { NextRequest } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as taskService from "@/features/tasks/service";
import { BulkUpdateTaskSchema } from "@/features/tasks/schemas";

export async function PATCH(request: NextRequest) {
  return withAuth(async (userId) => {
    const body = await request.json().catch(() => ({}));
    const parsed = BulkUpdateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400, "VALIDATION_ERROR");
    }
    try {
      const results = await taskService.updateMany(userId, parsed.data);
      return jsonSuccess({ results });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Validation failed";
      return jsonError(message, 400, "VALIDATION_ERROR");
    }
  });
}
