import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/projects/[id]/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

vi.mock("@/features/projects/service", () => {
  const mockProject = {
    id: "proj-1",
    name: "Test project",
    description: null,
    metadata: null,
    ownerId: "test-user-id",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    getById: vi.fn().mockResolvedValue(mockProject),
    isMember: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue({ ...mockProject, name: "Updated" }),
    remove: vi.fn().mockResolvedValue(true),
  };
});

const params = Promise.resolve({ id: "proj-1" });

describe("API GET /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and project when member", async () => {
    const req = new Request("http://localhost:3000/api/projects/proj-1");
    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe("proj-1");
    expect(body.data.name).toBe("Test project");
  });

  it("returns 404 when project not found", async () => {
    const { getById } = await import("@/features/projects/service");
    vi.mocked(getById).mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/projects/proj-1");
    const res = await GET(req, { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("returns 404 when not a member (getById returns null)", async () => {
    const { getById } = await import("@/features/projects/service");
    vi.mocked(getById).mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/projects/proj-1");
    const res = await GET(req, { params });
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
  });

  it("returns 401 when not authenticated", async () => {
    const { requireUserId } = await import("@/core/auth");
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const req = new Request("http://localhost:3000/api/projects/proj-1");
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("UNAUTHORIZED");
  });
});

describe("API PATCH /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and updated project", async () => {
    const req = new Request("http://localhost:3000/api/projects/proj-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Updated");
  });

  it("returns 403 when not a member", async () => {
    const { isMember } = await import("@/features/projects/service");
    vi.mocked(isMember).mockResolvedValueOnce(false);
    const req = new Request("http://localhost:3000/api/projects/proj-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("FORBIDDEN");
  });
});

describe("API DELETE /api/projects/[id]", () => {
  it("returns 200 when owner removes project", async () => {
    const req = new Request("http://localhost:3000/api/projects/proj-1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it("returns 403 when remove returns false", async () => {
    const { remove } = await import("@/features/projects/service");
    vi.mocked(remove).mockResolvedValueOnce(false);
    const req = new Request("http://localhost:3000/api/projects/proj-1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(403);
  });
});
