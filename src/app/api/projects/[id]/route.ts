import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as projectService from "@/features/projects/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAuth(async (userId) => {
    const { id } = await params;
    const project = await projectService.getById(id, userId);
    if (!project) return jsonError("Project not found", 404, "NOT_FOUND");
    return jsonSuccess(project);
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (userId) => {
    const { id } = await params;
    const isMember = await projectService.isMember(id, userId);
    if (!isMember) return jsonError("Forbidden", 403, "FORBIDDEN");
    const body = await request.json().catch(() => ({}));
    const parsed = (await import("@/features/projects/schemas")).UpdateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400, "VALIDATION_ERROR");
    }
    const project = await projectService.update(id, userId, parsed.data);
    if (!project) return jsonError("Project not found", 404, "NOT_FOUND");
    return jsonSuccess(project);
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAuth(async (userId) => {
    const { id } = await params;
    const ok = await projectService.remove(id, userId);
    if (!ok) return jsonError("Forbidden or not found", 403, "FORBIDDEN");
    return jsonSuccess({ deleted: true });
  });
}
