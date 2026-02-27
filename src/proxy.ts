import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optional proxy for route protection (Next.js 16+).
 * API routes enforce auth via withAuth + getServerSession in each handler.
 * Add matcher and auth checks here when you want to protect page routes (e.g. /dashboard).
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
