import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as createPost } from "@/app/api/invite/create/route";
import { POST as joinPost } from "@/app/api/invite/join/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

vi.mock("@/features/invite/service", () => ({
  createCode: vi.fn().mockResolvedValue({ id: "inv-1", code: "ABC123", projectId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee", createdAt: new Date() }),
  joinByCode: vi.fn().mockResolvedValue({ projectId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee", role: "member" }),
}));

describe("API POST /api/invite/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 and invite with code", async () => {
    const req = new Request("http://localhost:3000/api/invite/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.code).toBe("ABC123");
    expect(body.data.projectId).toBeDefined();
  });

  it("returns 400 when projectId missing or invalid", async () => {
    const req = new Request("http://localhost:3000/api/invite/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await createPost(req);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when not allowed to create invite", async () => {
    const { createCode } = await import("@/features/invite/service");
    vi.mocked(createCode).mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/invite/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("FORBIDDEN");
  });
});

describe("API POST /api/invite/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and result when code valid", async () => {
    const req = new Request("http://localhost:3000/api/invite/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "ABC123" }),
    });
    const res = await joinPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.projectId).toBeDefined();
    expect(body.data.role).toBe("member");
  });

  it("returns 400 when code missing", async () => {
    const req = new Request("http://localhost:3000/api/invite/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await joinPost(req);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when code invalid or expired", async () => {
    const { joinByCode } = await import("@/features/invite/service");
    vi.mocked(joinByCode).mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/invite/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "BAD" }),
    });
    const res = await joinPost(req);
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
  });
});
