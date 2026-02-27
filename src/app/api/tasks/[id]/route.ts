import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as taskService from "@/features/tasks/service";
import { UpdateTaskSchema } from "@/features/tasks/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAuth(async (userId) => {
    const { id } = await params;
    const task = await taskService.getById(id, userId);
    if (!task) return jsonError("Task not found", 404, "NOT_FOUND");
    return jsonSuccess(task);
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (userId) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = UpdateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400, "VALIDATION_ERROR");
    }
    try {
      const task = await taskService.update(id, userId, parsed.data);
      if (!task) return jsonError("Task not found", 404, "NOT_FOUND");
      return jsonSuccess(task);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Validation failed";
      return jsonError(message, 400, "VALIDATION_ERROR");
    }
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAuth(async (userId) => {
    const { id } = await params;
    const ok = await taskService.remove(id, userId);
    if (!ok) return jsonError("Task not found", 404, "NOT_FOUND");
    return jsonSuccess({ deleted: true });
  });
}
