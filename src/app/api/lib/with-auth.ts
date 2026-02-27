import { NextResponse } from "next/server";
import { requireUserId } from "@/core/auth";
import { checkApiRateLimit, getApiRateLimitRetryAfter } from "@/core/rate-limit";
import { success, apiError } from "@/shared/types/api";

export async function withAuth(
  handler: (userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const userId = await requireUserId().catch(() => null);
  if (!userId) {
    return NextResponse.json(apiError("Unauthorized", "UNAUTHORIZED"), { status: 401 });
  }
  if (!checkApiRateLimit(userId)) {
    const retryAfter = getApiRateLimitRetryAfter(userId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e985d5a4-0cfa-4f89-88df-878213bbc18c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'with-auth.ts:rateLimit',message:'429 rate limit',data:{userId:userId.slice(0,8),retryAfter},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      apiError("Too many requests", "RATE_LIMIT"),
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  return handler(userId);
}

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(success(data), { status });
}

export function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json(apiError(message, code), { status });
}
