import { describe, it, expect, vi, beforeEach } from "vitest";
import * as undoService from "@/features/undo/service";
import { BOARD_EVENT_TYPES } from "@/shared/constants/events";

const mockTask = {
  id: "task-1",
  projectId: "board-1",
  parentId: null,
  title: "Sticky",
  status: "open",
  assignedTo: null,
  configuration: { type: "sticky", position: { x: 0, y: 0 }, size: { w: 200, h: 120 } },
  dependencies: null,
  createdById: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const undoTaskCreatedEvent = {
  id: "ev-1",
  boardId: "board-1",
  seq: BigInt(1),
  type: BOARD_EVENT_TYPES.TASK_CREATED,
  payload: { taskId: "task-1", task: mockTask },
  userId: "user-1",
  createdAt: new Date(),
};

const undoTaskDeletedEvent = {
  id: "ev-2",
  boardId: "board-1",
  seq: BigInt(2),
  type: BOARD_EVENT_TYPES.TASK_DELETED,
  payload: { taskId: "task-1", task: mockTask },
  userId: "user-1",
  createdAt: new Date(),
};

const undoCommentAddedEvent = {
  id: "ev-3",
  boardId: "board-1",
  seq: BigInt(3),
  type: BOARD_EVENT_TYPES.COMMENT_ADDED,
  payload: { commentId: "comment-1", taskId: "task-1", comment: { id: "comment-1", taskId: "task-1", content: "Hi", authorId: "user-1" } },
  userId: "user-1",
  createdAt: new Date(),
};

const mockTx = {
  task: {
    create: vi.fn().mockResolvedValue(mockTask),
    delete: vi.fn().mockResolvedValue(mockTask),
    findUnique: vi.fn().mockResolvedValue(mockTask),
    update: vi.fn().mockResolvedValue(mockTask),
  },
  comment: {
    create: vi.fn().mockResolvedValue({ id: "comment-1" }),
    delete: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue({ id: "comment-1", content: "Hi" }),
    update: vi.fn().mockResolvedValue({ id: "comment-1", content: "Hi" }),
  },
};

vi.mock("@/core/db/client", () => ({
  db: {
    projectMember: { findFirst: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
  },
}));

vi.mock("@/core/events", () => ({
  getEventById: vi.fn(),
  appendEvent: vi.fn().mockResolvedValue({ id: "ev-undo", seq: 10 }),
}));

vi.mock("@/core/realtime", () => ({
  publish: vi.fn(),
}));

vi.mock("@/core/cache", () => ({
  boardCache: { invalidate: vi.fn() },
}));

describe("Undo service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { db } = await import("@/core/db/client");
    const { getEventById } = await import("@/core/events");
    vi.mocked(db.projectMember.findFirst).mockResolvedValue({ id: "m1", projectId: "board-1", userId: "user-1" } as never);
    vi.mocked(getEventById).mockResolvedValue(undoTaskCreatedEvent as never);
    vi.mocked(db.$transaction).mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx));
  });

  it("undo TASK_CREATED deletes task and returns task_deleted", async () => {
    const result = await undoService.undo("ev-1", "user-1");

    expect(result).toEqual({ type: "task_deleted", taskId: "task-1" });
    expect(mockTx.task.delete).toHaveBeenCalledWith({ where: { id: "task-1" } });
    const { publish } = await import("@/core/realtime");
    expect(publish).toHaveBeenCalledWith("board-1", expect.objectContaining({ type: BOARD_EVENT_TYPES.UNDO, result: { type: "task_deleted", taskId: "task-1" } }));
  });

  it("undo TASK_DELETED restores task and returns task_restored", async () => {
    const { getEventById } = await import("@/core/events");
    vi.mocked(getEventById).mockResolvedValueOnce(undoTaskDeletedEvent as never);

    const result = await undoService.undo("ev-2", "user-1");

    expect(result).toEqual({ type: "task_restored", taskId: "task-1" });
    expect(mockTx.task.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ id: "task-1", projectId: "board-1", title: "Sticky" }) }));
  });

  it("undo COMMENT_ADDED deletes comment and returns comment_deleted", async () => {
    const { getEventById } = await import("@/core/events");
    vi.mocked(getEventById).mockResolvedValueOnce(undoCommentAddedEvent as never);

    const result = await undoService.undo("ev-3", "user-1");

    expect(result).toEqual({ type: "comment_deleted", commentId: "comment-1" });
    expect(mockTx.comment.delete).toHaveBeenCalledWith({ where: { id: "comment-1" } });
  });

  it("undo returns null when event not found", async () => {
    const { getEventById } = await import("@/core/events");
    vi.mocked(getEventById).mockResolvedValueOnce(null);

    const result = await undoService.undo("ev-none", "user-1");
    expect(result).toBeNull();
  });

  it("undo returns null when not a project member", async () => {
    const { db } = await import("@/core/db/client");
    vi.mocked(db.projectMember.findFirst).mockResolvedValueOnce(null);

    const result = await undoService.undo("ev-1", "user-1");
    expect(result).toBeNull();
  });
});

describe("Redo service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { db } = await import("@/core/db/client");
    const { getEventById } = await import("@/core/events");
    vi.mocked(db.projectMember.findFirst).mockResolvedValue({ id: "m1", projectId: "board-1", userId: "user-1" } as never);
    vi.mocked(getEventById).mockResolvedValue({
      id: "ev-redo",
      boardId: "board-1",
      seq: BigInt(1),
      type: BOARD_EVENT_TYPES.TASK_DELETED,
      payload: { taskId: "task-1", task: mockTask },
      userId: "user-1",
      createdAt: new Date(),
    } as never);
    vi.mocked(db.$transaction).mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx));
  });

  it("redo TASK_DELETED deletes task and returns task_deleted", async () => {
    const result = await undoService.redo("ev-redo", "user-1");

    expect(result).toBeDefined();
    expect(result?.type).toBe("task_deleted");
    expect(result && "taskId" in result && result.taskId).toBe("task-1");
    expect(mockTx.task.delete).toHaveBeenCalledWith({ where: { id: "task-1" } });
  });

  it("redo returns null when not a member", async () => {
    const { db } = await import("@/core/db/client");
    vi.mocked(db.projectMember.findFirst).mockResolvedValueOnce(null);

    const result = await undoService.redo("ev-redo", "user-1");
    expect(result).toBeNull();
  });
});
