import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as commentService from "@/features/comments/service";

export async function GET(request: NextRequest) {
  return withAuth(async (userId) => {
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) return jsonError("projectId required", 400, "VALIDATION_ERROR");
    const summary = await commentService.getSummaryByProject(projectId, userId);
    return jsonSuccess(summary);
  });
}
