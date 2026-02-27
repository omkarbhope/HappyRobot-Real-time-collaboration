import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/projects/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

vi.mock("@/features/projects/service", () => ({
  listByUser: vi.fn().mockResolvedValue([
    { id: "p1", name: "Project 1", description: null, metadata: null, ownerId: "test-user-id", createdAt: new Date(), updatedAt: new Date() },
  ]),
}));

describe("API GET /api/projects", () => {
  it("returns 200 and list of projects when authenticated", async () => {
    const req = new Request("http://localhost:3000/api/projects");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Project 1");
  });
});
