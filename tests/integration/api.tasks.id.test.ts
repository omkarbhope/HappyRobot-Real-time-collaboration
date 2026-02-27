import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/tasks/[id]/route";

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
    configuration: null,
    dependencies: null,
    createdById: "test-user-id",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    getById: vi.fn().mockResolvedValue(mockTask),
    update: vi.fn().mockResolvedValue({ ...mockTask, title: "Updated" }),
    remove: vi.fn().mockResolvedValue(true),
  };
});

const params = Promise.resolve({ id: "task-1" });

describe("API GET /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and task when member", async () => {
    const req = new Request("http://localhost:3000/api/tasks/task-1");
    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe("task-1");
    expect(body.data.title).toBe("Test task");
  });

  it("returns 404 when task not found", async () => {
    const { getById } = await import("@/features/tasks/service");
    vi.mocked(getById).mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/tasks/task-1");
    const res = await GET(req, { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("returns 401 when not authenticated", async () => {
    const { requireUserId } = await import("@/core/auth");
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const req = new Request("http://localhost:3000/api/tasks/task-1");
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });
});

describe("API PATCH /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and updated task", async () => {
    const req = new Request("http://localhost:3000/api/tasks/task-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe("Updated");
  });

  it("returns 400 when body invalid", async () => {
    const req = new Request("http://localhost:3000/api/tasks/task-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when task not found", async () => {
    const { update } = await import("@/features/tasks/service");
    vi.mocked(update).mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/tasks/task-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
  });
});

describe("API DELETE /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and deleted true", async () => {
    const req = new Request("http://localhost:3000/api/tasks/task-1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 when task not found", async () => {
    const { remove } = await import("@/features/tasks/service");
    vi.mocked(remove).mockResolvedValueOnce(false);
    const req = new Request("http://localhost:3000/api/tasks/task-1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
  });
});
