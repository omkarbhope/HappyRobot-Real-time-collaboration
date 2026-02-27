import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/projects/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockRejectedValue(new Error("UNAUTHORIZED")),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

describe("API GET /api/projects", () => {
  it("returns 401 when not authenticated", async () => {
    const req = new Request("http://localhost:3000/api/projects");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.code).toBe("UNAUTHORIZED");
  });
});
