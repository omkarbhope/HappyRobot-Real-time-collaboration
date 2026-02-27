import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonSuccess, jsonError } from "@/app/api/lib/with-auth";
import * as projectService from "@/features/projects/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAuth(async (userId) => {
    const { id } = await params;
    const members = await projectService.listMembers(id, userId);
    return jsonSuccess(members);
  });
}
