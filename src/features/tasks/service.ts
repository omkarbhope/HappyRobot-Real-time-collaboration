import { db } from "@/core/db/client";
import { Prisma } from "@prisma/client";
import { appendEvent } from "@/core/events";
import { publish } from "@/core/realtime";
import { boardCache } from "@/core/cache";
import { BOARD_EVENT_TYPES } from "@/shared/constants/events";
import type { CreateTaskInput, UpdateTaskInput, BulkUpdateTaskInput } from "@/features/tasks/types";

/** Convert a Prisma task (may have Date) to a plain object safe for JSON.stringify over the wire. */
function taskForWire(task: { id: string; projectId: string; parentId?: string | null; title: string; status: string; assignedTo: unknown; configuration: unknown; dependencies: unknown; createdById: string | null; createdAt: Date | string; updatedAt: Date | string }): Record<string, unknown> {
  return {
    id: task.id,
    projectId: task.projectId,
    parentId: task.parentId ?? null,
    title: task.title,
    status: task.status,
    assignedTo: task.assignedTo,
    configuration: task.configuration,
    dependencies: task.dependencies,
    createdById: task.createdById,
    createdAt: typeof task.createdAt === "string" ? task.createdAt : (task.createdAt as Date).toISOString(),
    updatedAt: typeof task.updatedAt === "string" ? task.updatedAt : (task.updatedAt as Date).toISOString(),
  };
}

function isFrameTask(config: { type?: string } | null): boolean {
  return config?.type === "frame";
}

async function runCreateTransaction(
  projectId: string,
  userId: string,
  input: Omit<CreateTaskInput, "projectId">
) {
  return db.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        projectId,
        ...(input.parentId != null && { parentId: input.parentId }),
        title: input.title,
        status: input.status ?? "open",
        assignedTo: (input.assignedTo == null ? Prisma.JsonNull : input.assignedTo) as Prisma.InputJsonValue,
        configuration: (input.configuration == null ? Prisma.JsonNull : input.configuration) as Prisma.InputJsonValue,
        dependencies: (input.dependencies == null ? Prisma.JsonNull : input.dependencies) as Prisma.InputJsonValue,
        createdById: userId,
      } as Prisma.TaskUncheckedCreateInput,
    });
    const { id: eventId } = await appendEvent(tx, {
      boardId: projectId,
      type: BOARD_EVENT_TYPES.TASK_CREATED,
      payload: { taskId: created.id, task: created },
      userId,
    });
    return { task: created, eventId };
  });
}

export async function create(projectId: string, userId: string, input: Omit<CreateTaskInput, "projectId">) {
  if (input.parentId != null) {
    const parent = await db.task.findUnique({
      where: { id: input.parentId },
      select: { projectId: true, configuration: true },
    });
    if (!parent || parent.projectId !== projectId || !isFrameTask(parent.configuration as { type?: string } | null)) {
      throw new Error("parentId must reference a frame task in the same project");
    }
  }
  let result: Awaited<ReturnType<typeof runCreateTransaction>>;
  try {
    result = await runCreateTransaction(projectId, userId, input);
  } catch (err) {
    const isUniqueConstraint = err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002";
    if (isUniqueConstraint) {
      result = await runCreateTransaction(projectId, userId, input);
    } else {
      throw err;
    }
  }
  boardCache.invalidate(projectId);
  try {
    publish(projectId, {
      type: BOARD_EVENT_TYPES.TASK_CREATED,
      taskId: result.task.id,
      task: taskForWire(result.task),
      eventId: result.eventId,
    });
  } catch (err) {
    console.error("[tasks] publish TASK_CREATED failed:", err);
  }
  return result.task;
}

export async function getById(taskId: string, userId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: { where: { userId } } } } },
  });
  if (!task || task.project.members.length === 0) return null;
  const { project, ...rest } = task;
  return rest;
}

export async function listByProject(projectId: string, userId: string, cursor?: string, limit = 50) {
  const member = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!member) return [];
  const tasks = await db.task.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });
  const hasMore = tasks.length > limit;
  const items = hasMore ? tasks.slice(0, limit) : tasks;
  return { items, nextCursor: hasMore ? items[items.length - 1]?.id : null };
}

export async function update(taskId: string, userId: string, input: UpdateTaskInput) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: { where: { userId } } } } },
  });
  if (!task || task.project.members.length === 0) return null;
  const projectId = task.projectId;
  if (input.parentId !== undefined && input.parentId != null) {
    const parent = await db.task.findUnique({
      where: { id: input.parentId },
      select: { projectId: true, configuration: true },
    });
    if (!parent || parent.projectId !== projectId || !isFrameTask(parent.configuration as { type?: string } | null)) {
      throw new Error("parentId must reference a frame task in the same project");
    }
  }
  const updated = await db.$transaction(async (tx) => {
    const prev = await tx.task.findUnique({ where: { id: taskId } });
    if (!prev) return null;
    const u = await tx.task.update({
      where: { id: taskId },
      data: {
        ...(input.title != null && { title: input.title }),
        ...(input.status != null && { status: input.status }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        ...(input.assignedTo !== undefined && { assignedTo: (input.assignedTo == null ? Prisma.JsonNull : input.assignedTo) as Prisma.InputJsonValue }),
        ...(input.configuration !== undefined && { configuration: (input.configuration == null ? Prisma.JsonNull : input.configuration) as Prisma.InputJsonValue }),
        ...(input.dependencies !== undefined && { dependencies: (input.dependencies == null ? Prisma.JsonNull : input.dependencies) as Prisma.InputJsonValue }),
      },
    });
    const { id: eventId } = await appendEvent(tx, {
      boardId: projectId,
      type: BOARD_EVENT_TYPES.TASK_UPDATED,
      payload: { taskId, patch: input, previous: prev },
      userId,
    });
    return { updated: u, eventId };
  });
  if (updated) {
    boardCache.invalidate(projectId);
    try {
      publish(projectId, {
        type: BOARD_EVENT_TYPES.TASK_UPDATED,
        taskId,
        task: taskForWire(updated.updated),
        eventId: updated.eventId,
      });
    } catch (err) {
      console.error("[tasks] publish TASK_UPDATED failed:", err);
    }
  }
  return updated?.updated ?? null;
}

/** Bulk update tasks (e.g. position after multi-node drag). One rate-limit count for the whole request. */
export async function updateMany(
  userId: string,
  payload: BulkUpdateTaskInput
): Promise<Array<{ taskId: string; task: Awaited<ReturnType<typeof update>> }>> {
  const results: Array<{ taskId: string; task: Awaited<ReturnType<typeof update>> }> = [];
  for (const item of payload.updates) {
    const { taskId, ...rest } = item;
    const input: UpdateTaskInput = rest;
    const task = await update(taskId, userId, input);
    results.push({ taskId, task });
  }
  return results;
}

export async function remove(taskId: string, userId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: { where: { userId } } } } },
  });
  if (!task || task.project.members.length === 0) return false;
  const projectId = task.projectId;
  let eventId: string | undefined;
  await db.$transaction(async (tx) => {
    await tx.task.delete({ where: { id: taskId } });
    const result = await appendEvent(tx, {
      boardId: projectId,
      type: BOARD_EVENT_TYPES.TASK_DELETED,
      payload: { taskId, task },
      userId,
    });
    eventId = result.id;
  });
  boardCache.invalidate(projectId);
  try {
    publish(projectId, { type: BOARD_EVENT_TYPES.TASK_DELETED, taskId, eventId });
  } catch (err) {
    console.error("[tasks] publish TASK_DELETED failed:", err);
  }
  return true;
}
