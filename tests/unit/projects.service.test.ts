import { describe, it, expect, vi, beforeEach } from "vitest";
import * as projectService from "@/features/projects/service";

const mockProject = {
  id: "proj-1",
  name: "Test",
  description: null,
  metadata: null,
  ownerId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTx = {
  project: {
    create: vi.fn().mockResolvedValue(mockProject),
    update: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  projectMember: {
    create: vi.fn().mockResolvedValue({}),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  boardEvent: {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "ev-1", seq: 1 }),
  },
};

vi.mock("@/core/db/client", () => {
  const proj = {
    id: "proj-1",
    name: "Test",
    description: null,
    metadata: null,
    ownerId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    db: {
      project: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
      projectMember: {
        create: vi.fn().mockResolvedValue({}),
        findFirst: vi.fn().mockResolvedValue({
          id: "m1",
          projectId: "proj-1",
          userId: "user-1",
          role: "owner",
          joinedAt: new Date(),
          project: proj,
        }),
        findMany: vi.fn().mockResolvedValue([{ projectId: "proj-1" }]),
      },
      $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
    },
  };
});

vi.mock("@/core/events", () => ({
  appendEvent: vi.fn().mockResolvedValue({ id: "ev-1", seq: 1 }),
  getEvents: vi.fn(),
  getEventById: vi.fn(),
}));

vi.mock("@/core/realtime", () => ({
  publish: vi.fn(),
}));

vi.mock("@/core/cache", () => ({
  boardCache: { invalidate: vi.fn(), get: vi.fn(), set: vi.fn() },
}));

describe("Projects service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { db } = await import("@/core/db/client");
    vi.mocked(db.projectMember.findFirst).mockResolvedValue({
      id: "m1",
      projectId: "proj-1",
      userId: "user-1",
      role: "owner",
      joinedAt: new Date(),
      project: mockProject,
    });
    vi.mocked(db.$transaction).mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx));
  });

  it("create returns project and calls publish", async () => {
    const { publish } = await import("@/core/realtime");

    const result = await projectService.create("user-1", {
      name: "My Board",
      description: "Desc",
      metadata: null,
    });

    expect(result).toBeDefined();
    expect(result?.name).toBe("Test");
    expect(result?.id).toBe("proj-1");
    expect(publish).toHaveBeenCalledWith("proj-1", expect.objectContaining({ type: "project.created" }));
  });

  it("getById returns null when not a member", async () => {
    const { db } = await import("@/core/db/client");
    vi.mocked(db.projectMember.findFirst).mockResolvedValue(null);

    const result = await projectService.getById("proj-1", "user-1");
    expect(result).toBeNull();
  });

  it("listByUser returns projects from member projectIds", async () => {
    const { db } = await import("@/core/db/client");
    const projects = [{ ...mockProject, id: "p1" }, { ...mockProject, id: "p2" }];
    vi.mocked(db.projectMember.findMany).mockResolvedValue([{ projectId: "p1" }, { projectId: "p2" }] as never);
    vi.mocked(db.project.findMany).mockResolvedValue(projects as never);

    const result = await projectService.listByUser("user-1");
    expect(result).toHaveLength(2);
    expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["p1", "p2"] } } }));
  });
});

