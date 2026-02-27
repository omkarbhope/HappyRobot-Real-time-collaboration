import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as inviteService from "@/features/invite/service";
import { JoinByCodeSchema } from "@/features/invite/schemas";

export async function POST(request: NextRequest) {
  return withAuth(async (userId) => {
    const body = await request.json().catch(() => ({}));
    const parsed = JoinByCodeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, 400, "VALIDATION_ERROR");
    }
    const result = await inviteService.joinByCode(parsed.data.code, userId);
    if (!result) return jsonError("Invalid or expired code", 404, "NOT_FOUND");
    return jsonSuccess(result);
  });
}
