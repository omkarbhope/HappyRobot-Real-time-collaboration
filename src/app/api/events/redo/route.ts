import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as undoService from "@/features/undo/service";
import { RedoSchema } from "@/features/undo/schemas";

export async function POST(request: NextRequest) {
  return withAuth(async (userId) => {
    const body = await request.json().catch(() => ({}));
    const parsed = RedoSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400, "VALIDATION_ERROR");
    }
    const result = await undoService.redo(parsed.data.eventId, userId);
    if (!result) return jsonError("Event not found or cannot redo", 404, "NOT_FOUND");
    return jsonSuccess(result);
  });
}
