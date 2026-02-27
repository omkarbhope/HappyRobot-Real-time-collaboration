import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as commentService from "@/features/comments/service";
import { CreateCommentSchema, UpdateCommentSchema } from "@/features/comments/schemas";

export async function GET(request: NextRequest) {
  return withAuth(async (userId) => {
    const taskId = new URL(request.url).searchParams.get("taskId");
    if (!taskId) return jsonError("taskId required", 400, "VALIDATION_ERROR");
    const list = await commentService.listByTask(taskId, userId);
    return jsonSuccess(list);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (userId) => {
    const body = await request.json().catch(() => ({}));
    const parsed = CreateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400, "VALIDATION_ERROR");
    }
    const comment = await commentService.add(parsed.data, userId);
    if (!comment) return jsonError("Task not found or forbidden", 404, "NOT_FOUND");
    return jsonSuccess(comment, 201);
  });
}
