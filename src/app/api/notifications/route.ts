import { NextRequest } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as notificationService from "@/features/notifications/service";

export async function GET(request: NextRequest) {
  return withAuth(async (userId) => {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const list = await notificationService.listByUserWithPreviews(userId, limit);
    return jsonSuccess(list);
  });
}
