import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as commentService from "@/features/comments/service";
import { UpdateCommentSchema } from "@/features/comments/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (userId) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = UpdateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400, "VALIDATION_ERROR");
    }
    const comment = await commentService.update(id, userId, parsed.data);
    if (!comment) return jsonError("Comment not found", 404, "NOT_FOUND");
    return jsonSuccess(comment);
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAuth(async (userId) => {
    const { id } = await params;
    const ok = await commentService.remove(id, userId);
    if (!ok) return jsonError("Comment not found", 404, "NOT_FOUND");
    return jsonSuccess({ deleted: true });
  });
}
