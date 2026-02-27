import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/comments/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

vi.mock("@/features/comments/service", () => {
  const mockComment = {
    id: "comment-1",
    taskId: "task-1",
    content: "Hello",
    authorId: "test-user-id",
    resolved: false,
    positionX: null,
    positionY: null,
    mentionUserIds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    listByTask: vi.fn().mockResolvedValue([mockComment]),
    add: vi.fn().mockResolvedValue(mockComment),
  };
});

describe("API GET /api/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and list when taskId provided", async () => {
    const req = new Request("http://localhost:3000/api/comments?taskId=aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].content).toBe("Hello");
  });

  it("returns 400 when taskId is missing", async () => {
    const req = new Request("http://localhost:3000/api/comments");
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when not authenticated", async () => {
    const { requireUserId } = await import("@/core/auth");
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const req = new Request("http://localhost:3000/api/comments?taskId=aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("API POST /api/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 and comment when add succeeds", async () => {
    const req = new Request("http://localhost:3000/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee", content: "Hello" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.content).toBe("Hello");
    expect(body.data.id).toBe("comment-1");
  });

  it("returns 400 when body invalid", async () => {
    const req = new Request("http://localhost:3000/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee", content: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when task not found or forbidden", async () => {
    const { add } = await import("@/features/comments/service");
    vi.mocked(add).mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee", content: "Hi" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
  });
});
