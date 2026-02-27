import { NextRequest } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as notificationService from "@/features/notifications/service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: NextRequest, { params }: Params) {
  return withAuth(async (userId) => {
    const { id } = await params;
    const ok = await notificationService.markRead(id, userId);
    if (!ok) return jsonError("Notification not found", 404, "NOT_FOUND");
    return jsonSuccess({ read: true });
  });
}
