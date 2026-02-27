import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as projectService from "@/features/projects/service";
import { CreateProjectSchema, UpdateProjectSchema } from "@/features/projects/schemas";

export async function GET() {
  return withAuth(async (userId) => {
    const list = await projectService.listByUser(userId);
    return jsonSuccess(list);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (userId) => {
    const body = await request.json().catch(() => ({}));
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400, "VALIDATION_ERROR");
    }
    const project = await projectService.create(userId, parsed.data);
    return jsonSuccess(project, 201);
  });
}
