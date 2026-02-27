import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as inviteService from "@/features/invite/service";
import { CreateInviteCodeSchema } from "@/features/invite/schemas";

export async function POST(request: NextRequest) {
  return withAuth(async (userId) => {
    const body = await request.json().catch(() => ({}));
    const parsed = CreateInviteCodeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400, "VALIDATION_ERROR");
    }
    const invite = await inviteService.createCode(parsed.data.projectId, userId);
    if (!invite) return jsonError("Forbidden or project not found", 403, "FORBIDDEN");
    return jsonSuccess(invite, 201);
  });
}
