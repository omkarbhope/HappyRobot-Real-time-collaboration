import { db } from "@/core/db/client";
import { getEventById, appendEvent } from "@/core/events";
import { publish } from "@/core/realtime";
import { boardCache } from "@/core/cache";
import { BOARD_EVENT_TYPES } from "@/shared/constants/events";
import type { Prisma } from "@prisma/client";

export async function undo(eventId: string, userId: string) {
  const event = await getEventById(eventId);
  if (!event) return null;
  const boardId = event.boardId;
  const member = await db.projectMember.findFirst({
    where: { projectId: boardId, userId },
  });
  if (!member) return null;

  const payload = event.payload as Record<string, unknown>;

  const result = await db.$transaction(async (tx) => {
    switch (event.type) {
      case BOARD_EVENT_TYPES.TASK_CREATED: {
        const taskId = payload.taskId as string;
        await tx.task.delete({ where: { id: taskId } });
        await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.UNDO,
          payload: { undoEventId: eventId, type: BOARD_EVENT_TYPES.TASK_DELETED, taskId },
          userId,
        });
        return { type: "task_deleted" as const, taskId };
      }
      case BOARD_EVENT_TYPES.TASK_UPDATED: {
        const taskId = payload.taskId as string;
        const previous = payload.previous as Prisma.TaskCreateInput | null;
        if (!previous) return null;
        await tx.task.update({
          where: { id: taskId },
          data: {
            title: previous.title,
            status: previous.status,
            assignedTo: previous.assignedTo ?? undefined,
            configuration: previous.configuration ?? undefined,
            dependencies: previous.dependencies ?? undefined,
          },
        });
        await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.UNDO,
          payload: { undoEventId: eventId, type: BOARD_EVENT_TYPES.TASK_UPDATED, taskId, reverted: true },
          userId,
        });
        return { type: "task_reverted" as const, taskId };
      }
      case BOARD_EVENT_TYPES.TASK_DELETED: {
        const task = payload.task as Prisma.TaskUncheckedCreateInput;
        if (!task?.id) return null;
        await tx.task.create({
          data: {
            id: task.id,
            projectId: task.projectId,
            title: task.title,
            status: (task.status as string) ?? "open",
            assignedTo: task.assignedTo ?? undefined,
            configuration: task.configuration ?? undefined,
            dependencies: task.dependencies ?? undefined,
            createdById: task.createdById ?? undefined,
          },
        });
        await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.UNDO,
          payload: { undoEventId: eventId, type: BOARD_EVENT_TYPES.TASK_CREATED, taskId: task.id },
          userId,
        });
        return { type: "task_restored" as const, taskId: task.id };
      }
      case BOARD_EVENT_TYPES.COMMENT_ADDED: {
        const commentId = payload.commentId as string;
        await tx.comment.delete({ where: { id: commentId } });
        await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.UNDO,
          payload: { undoEventId: eventId, type: BOARD_EVENT_TYPES.COMMENT_DELETED, commentId },
          userId,
        });
        return { type: "comment_deleted" as const, commentId };
      }
      case BOARD_EVENT_TYPES.COMMENT_UPDATED: {
        const comment = payload.comment as { id: string; content: string };
        if (!comment?.id) return null;
        const prevContent = (payload.previous as { content?: string })?.content;
        if (prevContent == null) return null;
        await tx.comment.update({
          where: { id: comment.id },
          data: { content: prevContent },
        });
        await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.UNDO,
          payload: { undoEventId: eventId, type: BOARD_EVENT_TYPES.COMMENT_UPDATED, commentId: comment.id },
          userId,
        });
        return { type: "comment_reverted" as const, commentId: comment.id };
      }
      case BOARD_EVENT_TYPES.COMMENT_DELETED: {
        const comment = payload.comment as { id: string; taskId: string; content: string; authorId: string };
        if (!comment?.id) return null;
        await tx.comment.create({
          data: {
            id: comment.id,
            taskId: comment.taskId,
            content: comment.content,
            authorId: comment.authorId,
          },
        });
        await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.UNDO,
          payload: { undoEventId: eventId, type: BOARD_EVENT_TYPES.COMMENT_ADDED, commentId: comment.id },
          userId,
        });
        return { type: "comment_restored" as const, commentId: comment.id };
      }
      default:
        return null;
    }
  });

  if (result) {
    boardCache.invalidate(boardId);
    publish(boardId, { type: BOARD_EVENT_TYPES.UNDO, eventId, result });
  }
  return result;
}

/** Re-apply an undone event (redo). Only supports events that undo supports. */
export async function redo(eventId: string, userId: string) {
  const event = await getEventById(eventId);
  if (!event) return null;
  const boardId = event.boardId;
  const member = await db.projectMember.findFirst({
    where: { projectId: boardId, userId },
  });
  if (!member) return null;

  const payload = event.payload as Record<string, unknown>;

  const result = await db.$transaction(async (tx) => {
    switch (event.type) {
      case BOARD_EVENT_TYPES.TASK_CREATED: {
        const task = payload.task as Prisma.TaskUncheckedCreateInput;
        if (!task?.id) return null;
        await tx.task.create({
          data: {
            id: task.id,
            projectId: task.projectId,
            title: task.title,
            status: (task.status as string) ?? "open",
            assignedTo: task.assignedTo ?? undefined,
            configuration: task.configuration ?? undefined,
            dependencies: task.dependencies ?? undefined,
            createdById: task.createdById ?? undefined,
          },
        });
        const { id: newEventId } = await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.TASK_CREATED,
          payload: { taskId: task.id, task },
          userId,
        });
        return { type: "task_created" as const, taskId: task.id, task, newEventId };
      }
      case BOARD_EVENT_TYPES.TASK_UPDATED: {
        const taskId = payload.taskId as string;
        const patch = payload.patch as Record<string, unknown>;
        if (!patch) return null;
        const prev = await tx.task.findUnique({ where: { id: taskId } });
        if (!prev) return null;
        const u = await tx.task.update({
          where: { id: taskId },
          data: {
            ...(patch.title != null && { title: patch.title as string }),
            ...(patch.status != null && { status: patch.status as string }),
            ...(patch.assignedTo !== undefined && { assignedTo: patch.assignedTo as Prisma.InputJsonValue }),
            ...(patch.configuration !== undefined && { configuration: patch.configuration as Prisma.InputJsonValue }),
            ...(patch.dependencies !== undefined && { dependencies: patch.dependencies as Prisma.InputJsonValue }),
          },
        });
        const { id: newEventId } = await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.TASK_UPDATED,
          payload: { taskId, patch, previous: prev },
          userId,
        });
        return { type: "task_updated" as const, taskId, task: u, newEventId };
      }
      case BOARD_EVENT_TYPES.TASK_DELETED: {
        const taskId = payload.taskId as string;
        const task = payload.task as Prisma.TaskUncheckedCreateInput;
        if (!task?.id) return null;
        await tx.task.delete({ where: { id: taskId } });
        const { id: newEventId } = await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.TASK_DELETED,
          payload: { taskId, task },
          userId,
        });
        return { type: "task_deleted" as const, taskId, newEventId };
      }
      case BOARD_EVENT_TYPES.COMMENT_ADDED: {
        const comment = payload.comment as { id: string; taskId: string; content: string; authorId: string };
        if (!comment?.id) return null;
        await tx.comment.create({
          data: {
            id: comment.id,
            taskId: comment.taskId,
            content: comment.content,
            authorId: comment.authorId,
          },
        });
        const { id: newEventId } = await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.COMMENT_ADDED,
          payload: { commentId: comment.id, taskId: comment.taskId, comment },
          userId,
        });
        return { type: "comment_added" as const, commentId: comment.id, comment, newEventId };
      }
      case BOARD_EVENT_TYPES.COMMENT_UPDATED: {
        const comment = payload.comment as { id: string; taskId: string; content: string };
        if (!comment?.id) return null;
        const prev = await tx.comment.findUnique({ where: { id: comment.id } });
        if (!prev) return null;
        const u = await tx.comment.update({
          where: { id: comment.id },
          data: { content: comment.content },
        });
        const { id: newEventId } = await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.COMMENT_UPDATED,
          payload: { commentId: comment.id, comment: u, previous: { content: prev.content } },
          userId,
        });
        return { type: "comment_updated" as const, commentId: comment.id, comment: u, newEventId };
      }
      case BOARD_EVENT_TYPES.COMMENT_DELETED: {
        const commentId = payload.commentId as string;
        const comment = payload.comment as { id: string; taskId: string; content: string; authorId: string };
        if (!comment?.id) return null;
        await tx.comment.delete({ where: { id: commentId } });
        const { id: newEventId } = await appendEvent(tx, {
          boardId,
          type: BOARD_EVENT_TYPES.COMMENT_DELETED,
          payload: { commentId, comment },
          userId,
        });
        return { type: "comment_deleted" as const, commentId, taskId: comment.taskId, newEventId };
      }
      default:
        return null;
    }
  });

  if (result) {
    boardCache.invalidate(boardId);
    if (result.type === "task_created" && "task" in result) {
      const taskForWire = {
        ...result.task,
        createdAt: result.task.createdAt instanceof Date ? result.task.createdAt.toISOString() : (result.task as { createdAt?: string }).createdAt,
        updatedAt: result.task.updatedAt instanceof Date ? result.task.updatedAt.toISOString() : (result.task as { updatedAt?: string }).updatedAt,
      };
      publish(boardId, { type: BOARD_EVENT_TYPES.TASK_CREATED, taskId: result.taskId, task: taskForWire, eventId: result.newEventId });
    } else if (result.type === "task_updated" && "task" in result) {
      const task = result.task as { id: string; projectId: string; title: string; status: string; configuration: unknown; dependencies: unknown; createdAt: Date; updatedAt: Date };
      const taskForWire = {
        ...task,
        createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : (task as unknown as { createdAt?: string }).createdAt,
        updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : (task as unknown as { updatedAt?: string }).updatedAt,
      };
      publish(boardId, { type: BOARD_EVENT_TYPES.TASK_UPDATED, taskId: result.taskId, task: taskForWire, eventId: result.newEventId });
    } else if (result.type === "task_deleted") {
      publish(boardId, { type: BOARD_EVENT_TYPES.TASK_DELETED, taskId: result.taskId, eventId: result.newEventId });
    } else if (result.type === "comment_added" && "comment" in result) {
      publish(boardId, { type: BOARD_EVENT_TYPES.COMMENT_ADDED, commentId: result.commentId, taskId: (result.comment as { taskId: string }).taskId, comment: result.comment, eventId: result.newEventId });
    } else if (result.type === "comment_updated" && "comment" in result) {
      publish(boardId, { type: BOARD_EVENT_TYPES.COMMENT_UPDATED, commentId: result.commentId, comment: result.comment, eventId: result.newEventId });
    } else if (result.type === "comment_deleted") {
      publish(boardId, { type: BOARD_EVENT_TYPES.COMMENT_DELETED, commentId: result.commentId, taskId: result.taskId, eventId: result.newEventId });
    }
  }
  return result;
}
