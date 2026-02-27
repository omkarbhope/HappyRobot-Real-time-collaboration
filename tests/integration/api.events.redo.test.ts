import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/events/redo/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

vi.mock("@/features/undo/service", () => ({
  redo: vi.fn().mockResolvedValue({ type: "task_restored", taskId: "task-1" }),
}));

describe("API POST /api/events/redo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and result when redo succeeds", async () => {
    const req = new Request("http://localhost:3000/api/events/redo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: "ev-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ type: "task_restored", taskId: "task-1" });
  });

  it("returns 400 when eventId is missing", async () => {
    const req = new Request("http://localhost:3000/api/events/redo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when event not found or cannot redo", async () => {
    const { redo } = await import("@/features/undo/service");
    vi.mocked(redo).mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/events/redo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: "ev-none" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
  });
});
