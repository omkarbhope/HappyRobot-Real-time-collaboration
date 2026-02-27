import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/events/undo/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

vi.mock("@/features/undo/service", () => ({
  undo: vi.fn().mockResolvedValue({ type: "task_deleted", taskId: "task-1" }),
}));

describe("API POST /api/events/undo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and result when undo succeeds", async () => {
    const req = new Request("http://localhost:3000/api/events/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: "ev-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ type: "task_deleted", taskId: "task-1" });
  });

  it("returns 400 when eventId is missing", async () => {
    const req = new Request("http://localhost:3000/api/events/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
