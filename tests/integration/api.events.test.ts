import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/events/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

vi.mock("@/features/projects/service", () => ({
  isMember: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/core/events", () => ({
  getEvents: vi.fn().mockResolvedValue({ events: [], nextSeq: null }),
}));

vi.mock("@/core/cache", () => ({
  boardCache: { get: vi.fn().mockReturnValue(null), set: vi.fn(), invalidate: vi.fn() },
}));

describe("API GET /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and events list when member", async () => {
    const req = new Request("http://localhost:3000/api/events?boardId=proj-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.events).toEqual([]);
  });

  it("returns 400 when boardId is missing", async () => {
    const req = new Request("http://localhost:3000/api/events");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when not a member", async () => {
    const { isMember } = await import("@/features/projects/service");
    vi.mocked(isMember).mockResolvedValueOnce(false);
    const req = new Request("http://localhost:3000/api/events?boardId=proj-1");
    const res = await GET(req);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("FORBIDDEN");
  });

  it("returns 401 when not authenticated", async () => {
    const { requireUserId } = await import("@/core/auth");
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const req = new Request("http://localhost:3000/api/events?boardId=proj-1");
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("UNAUTHORIZED");
  });
});
