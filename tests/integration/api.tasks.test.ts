import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/tasks/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

vi.mock("@/features/tasks/service", () => {
  const mockTask = {
    id: "task-1",
    projectId: "proj-1",
    parentId: null,
    title: "Test task",
    status: "open",
    assignedTo: null,
    configuration: { type: "sticky", position: { x: 0, y: 0 }, size: { w: 200, h: 120 } },
    dependencies: null,
    createdById: "test-user-id",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return {
    create: vi.fn().mockResolvedValue(mockTask),
    listByProject: vi.fn().mockResolvedValue({ items: [mockTask], nextCursor: null }),
    listByProjectInBounds: vi.fn().mockResolvedValue({ items: [mockTask] }),
  };
});

describe("API POST /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 and task when create succeeds", async () => {
    const req = new Request("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee",
        title: "Test task",
        configuration: { type: "sticky", position: { x: 0, y: 0 }, size: { w: 200, h: 120 } },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe("task-1");
    expect(body.data.title).toBe("Test task");
  });

  it("returns 400 when projectId is missing", async () => {
    const req = new Request("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when not authenticated", async () => {
    const { requireUserId } = await import("@/core/auth");
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const req = new Request("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "proj-1", title: "Test", configuration: { type: "sticky", position: { x: 0, y: 0 }, size: { w: 200, h: 120 } } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("UNAUTHORIZED");
  });
});

describe("API GET /api/tasks", () => {
  it("returns 200 and items when projectId provided", async () => {
    const req = new Request("http://localhost:3000/api/tasks?projectId=proj-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].title).toBe("Test task");
  });

  it("returns 400 when projectId is missing", async () => {
    const req = new Request("http://localhost:3000/api/tasks");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when not authenticated", async () => {
    const { requireUserId } = await import("@/core/auth");
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const req = new Request("http://localhost:3000/api/tasks?projectId=proj-1");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.code).toBe("UNAUTHORIZED");
  });
});
