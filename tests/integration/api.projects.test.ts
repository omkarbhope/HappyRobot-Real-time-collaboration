import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/projects/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

vi.mock("@/features/projects/service", () => {
  const mockProject = {
    id: "p1",
    name: "Project 1",
    description: null,
    metadata: null,
    ownerId: "test-user-id",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    listByUser: vi.fn().mockResolvedValue([mockProject]),
    create: vi.fn().mockResolvedValue(mockProject),
  };
});

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

  it("returns 401 when not authenticated", async () => {
    const { requireUserId } = await import("@/core/auth");
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const req = new Request("http://localhost:3000/api/projects");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });
});

describe("API POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 and project when create succeeds", async () => {
    const req = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New board" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe("Project 1");
    expect(body.data.id).toBe("p1");
  });

  it("returns 400 when name is missing", async () => {
    const req = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });
});
