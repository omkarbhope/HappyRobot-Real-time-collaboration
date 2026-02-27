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
