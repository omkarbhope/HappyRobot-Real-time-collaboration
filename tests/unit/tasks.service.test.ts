import { describe, it, expect, vi, beforeEach } from "vitest";
import * as taskService from "@/features/tasks/service";

const mockTask = {
  id: "task-1",
  projectId: "proj-1",
  parentId: null,
  title: "Test",
  status: "open",
  assignedTo: null,
  configuration: { type: "sticky", position: { x: 0, y: 0 }, size: { w: 200, h: 120 } },
  dependencies: null,
  createdById: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  project: { members: [{ userId: "user-1" }] },
};

vi.mock("@/core/db/client", () => ({
  db: {
    task: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectMember: { findFirst: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

const mockTx = {
  task: {
    create: vi.fn().mockResolvedValue(mockTask),
    findUnique: vi.fn().mockResolvedValue(mockTask),
    update: vi.fn().mockResolvedValue({ ...mockTask, title: "Updated" }),
    delete: vi.fn().mockResolvedValue(mockTask),
  },
};

vi.mock("@/core/events", () => ({
  appendEvent: vi.fn().mockResolvedValue({ id: "ev-1", seq: 1 }),
}));

vi.mock("@/core/realtime", () => ({
  publish: vi.fn(),
}));

vi.mock("@/core/cache", () => ({
  boardCache: { invalidate: vi.fn() },
}));

describe("Tasks service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { db } = await import("@/core/db/client");
    vi.mocked(db.$transaction).mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx));
    vi.mocked(db.projectMember.findFirst).mockResolvedValue({ id: "m1", projectId: "proj-1", userId: "user-1" });
    vi.mocked(db.task.findUnique).mockResolvedValue({
      ...mockTask,
      project: { members: [{ userId: "user-1" }] },
    } as never);
    vi.mocked(db.task.findMany).mockResolvedValue([mockTask] as never);
    vi.mocked(db.task.create).mockResolvedValue(mockTask as never);
    vi.mocked(db.task.update).mockResolvedValue({ ...mockTask, title: "Updated" } as never);
    vi.mocked(db.task.delete).mockResolvedValue(mockTask as never);
  });

  it("create returns task and invalidates cache and publishes", async () => {
    const { publish } = await import("@/core/realtime");
    const { boardCache } = await import("@/core/cache");

    const result = await taskService.create("proj-1", "user-1", {
      title: "Test",
      configuration: { type: "sticky", position: { x: 0, y: 0 }, size: { w: 200, h: 120 } },
    });

    expect(result).toBeDefined();
    expect(result?.id).toBe("task-1");
    expect(boardCache.invalidate).toHaveBeenCalledWith("proj-1");
    expect(publish).toHaveBeenCalledWith("proj-1", expect.objectContaining({ type: "task.created", taskId: "task-1" }));
  });

  it("getById returns task when member", async () => {
    const result = await taskService.getById("task-1", "user-1");
    expect(result).toBeDefined();
    expect(result?.id).toBe("task-1");
    expect(result).not.toHaveProperty("project");
  });

  it("getById returns null when not a member", async () => {
    const { db } = await import("@/core/db/client");
    vi.mocked(db.task.findUnique).mockResolvedValueOnce({
      ...mockTask,
      project: { members: [] },
    } as never);

    const result = await taskService.getById("task-1", "user-1");
    expect(result).toBeNull();
  });

  it("listByProject returns items and nextCursor when member", async () => {
    const { db } = await import("@/core/db/client");
    vi.mocked(db.projectMember.findFirst).mockResolvedValue({ projectId: "proj-1", userId: "user-1" } as never);
    vi.mocked(db.task.findMany).mockResolvedValue([mockTask, { ...mockTask, id: "task-2" }] as never);

    const result = await taskService.listByProject("proj-1", "user-1", undefined, 1);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe("task-1");
  });

  it("listByProject returns empty array when not a member", async () => {
    const { db } = await import("@/core/db/client");
    vi.mocked(db.projectMember.findFirst).mockResolvedValueOnce(null);

    const result = await taskService.listByProject("proj-1", "user-1");
    expect(result).toEqual([]);
  });

  it("update returns task and publishes", async () => {
    const { publish } = await import("@/core/realtime");

    const result = await taskService.update("task-1", "user-1", { title: "Updated" });
    expect(result?.title).toBe("Updated");
    expect(publish).toHaveBeenCalledWith("proj-1", expect.objectContaining({ type: "task.updated" }));
  });

  it("remove returns true when member and deletes", async () => {
    const result = await taskService.remove("task-1", "user-1");
    expect(result).toBe(true);
    expect(mockTx.task.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "task-1" } }));
  });

  it("remove returns false when not a member", async () => {
    const { db } = await import("@/core/db/client");
    vi.mocked(db.task.findUnique).mockResolvedValueOnce({
      ...mockTask,
      project: { members: [] },
    } as never);

    const result = await taskService.remove("task-1", "user-1");
    expect(result).toBe(false);
  });
});
