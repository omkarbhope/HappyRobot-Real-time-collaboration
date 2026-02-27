import { NextRequest } from "next/server";
import { withAuth, jsonSuccess } from "@/app/api/lib/with-auth";
import * as notificationService from "@/features/notifications/service";

export async function PATCH(_request: NextRequest) {
  return withAuth(async (userId) => {
    await notificationService.markAllRead(userId);
    return jsonSuccess({ read: true });
  });
}
