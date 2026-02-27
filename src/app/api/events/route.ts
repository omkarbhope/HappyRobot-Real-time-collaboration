import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import { getEvents } from "@/core/events";
import { boardCache } from "@/core/cache";
import * as projectService from "@/features/projects/service";

const CACHE_KEY_EVENTS = (boardId: string, afterSeq: number, limit: number) =>
  `events:${boardId}:${afterSeq}:${limit}`;

export async function GET(request: NextRequest) {
  return withAuth(async (userId) => {
    const url = new URL(request.url);
    const boardId = url.searchParams.get("boardId");
    if (!boardId) return jsonError("boardId required", 400, "VALIDATION_ERROR");
    const isMember = await projectService.isMember(boardId, userId);
    if (!isMember) return jsonError("Forbidden", 403, "FORBIDDEN");
    const afterSeq = parseInt(url.searchParams.get("afterSeq") ?? "0", 10);
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50);

    const cacheKey = CACHE_KEY_EVENTS(boardId, afterSeq, limit);
    const cached = boardCache.get<Awaited<ReturnType<typeof getEvents>>>(cacheKey);
    if (cached) return jsonSuccess(cached);

    const events = await getEvents(boardId, { afterSeq, limit });
    boardCache.set(cacheKey, events);
    return jsonSuccess(events);
  });
}
