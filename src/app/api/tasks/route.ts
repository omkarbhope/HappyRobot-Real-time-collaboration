import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as taskService from "@/features/tasks/service";
import { CreateTaskSchema } from "@/features/tasks/schemas";
import { PaginationSchema } from "@/shared/schemas";

export async function GET(request: NextRequest) {
  return withAuth(async (userId) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) return jsonError("projectId required", 400, "VALIDATION_ERROR");

    const minX = url.searchParams.get("minX");
    const minY = url.searchParams.get("minY");
    const maxX = url.searchParams.get("maxX");
    const maxY = url.searchParams.get("maxY");
    const hasBounds =
      minX != null &&
      minY != null &&
      maxX != null &&
      maxY != null &&
      minX !== "" &&
      minY !== "" &&
      maxX !== "" &&
      maxY !== "";

    if (hasBounds) {
      const minXNum = parseFloat(minX!);
      const minYNum = parseFloat(minY!);
      const maxXNum = parseFloat(maxX!);
      const maxYNum = parseFloat(maxY!);
      if (
        !Number.isFinite(minXNum) ||
        !Number.isFinite(minYNum) ||
        !Number.isFinite(maxXNum) ||
        !Number.isFinite(maxYNum)
      ) {
        return jsonError("minX, minY, maxX, maxY must be finite numbers", 400, "VALIDATION_ERROR");
      }
      const result = await taskService.listByProjectInBounds(projectId, userId, {
        minX: minXNum,
        minY: minYNum,
        maxX: maxXNum,
        maxY: maxYNum,
      });
      return jsonSuccess(result);
    }

    const pagination = PaginationSchema.safeParse({
      cursor: url.searchParams.get("cursor"),
      limit: url.searchParams.get("limit"),
    });
    const { cursor, limit } = pagination.success ? pagination.data : { cursor: undefined, limit: 20 };
    const result = await taskService.listByProject(projectId, userId, cursor, limit);
    return jsonSuccess(result);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (userId) => {
    const body = await request.json().catch(() => ({}));
    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400, "VALIDATION_ERROR");
    }
    const { projectId, ...rest } = parsed.data;
    try {
      const task = await taskService.create(projectId, userId, rest);
      return jsonSuccess(task, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Validation failed";
      return jsonError(message, 400, "VALIDATION_ERROR");
    }
  });
}
