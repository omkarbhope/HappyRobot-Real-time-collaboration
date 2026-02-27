import { db } from "@/core/db/client";
import { appendEvent } from "@/core/events";
import { publish } from "@/core/realtime";
import { boardCache } from "@/core/cache";
import { BOARD_EVENT_TYPES } from "@/shared/constants/events";
import type { CreateCommentInput, UpdateCommentInput } from "@/features/comments/types";
import * as notificationService from "@/features/notifications/service";

async function getProjectIdByTaskId(taskId: string): Promise<string | null> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  return task?.projectId ?? null;
}

export async function add(input: CreateCommentInput, userId: string) {
  const { taskId, content, positionX, positionY, mentionUserIds } = input;
  const projectId = await getProjectIdByTaskId(taskId);
  if (!projectId) return null;
  const member = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!member) return null;
  const mentionIds = Array.isArray(mentionUserIds) ? mentionUserIds : [];
  const result = await db.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: {
        taskId,
        content,
        authorId: userId,
        ...(positionX != null && { positionX }),
        ...(positionY != null && { positionY }),
        ...(mentionIds.length > 0 && { mentionUserIds: mentionIds as unknown as object }),
      },
    });
    const { id: eventId } = await appendEvent(tx, {
      boardId: projectId,
      type: BOARD_EVENT_TYPES.COMMENT_ADDED,
      payload: { commentId: c.id, taskId, comment: c },
      userId,
    });
    return { comment: c, eventId };
  });
  boardCache.invalidate(projectId);
  for (const mentionedUserId of mentionIds) {
    if (mentionedUserId !== userId) {
      try {
        await notificationService.createForCommentMention(mentionedUserId, result.comment.id, taskId);
      } catch (_) {
        // ignore duplicate or invalid user
      }
    }
  }
  const commentWithAuthor = await db.comment.findUnique({
    where: { id: result.comment.id },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
  const toPublish = commentWithAuthor ?? result.comment;
  publish(projectId, { type: BOARD_EVENT_TYPES.COMMENT_ADDED, commentId: result.comment.id, taskId, comment: toPublish, eventId: result.eventId });
  return commentWithAuthor ?? result.comment;
}

export async function listByTask(taskId: string, userId: string) {
  const projectId = await getProjectIdByTaskId(taskId);
  if (!projectId) return [];
  const member = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!member) return [];
  return db.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
}

export type CommentSummaryItem = {
  taskId: string;
  count: number;
  latest?: {
    id: string;
    content: string;
    author: { id: string; name: string | null; image: string | null };
    createdAt: Date;
    position?: { x: number; y: number };
  };
};

export async function getSummaryByProject(projectId: string, userId: string): Promise<CommentSummaryItem[]> {
  const member = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!member) return [];
  const comments = await db.comment.findMany({
    where: { task: { projectId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      taskId: true,
      content: true,
      createdAt: true,
      positionX: true,
      positionY: true,
      author: { select: { id: true, name: true, image: true } },
    },
  });
  const byTask = new Map<string, typeof comments>();
  for (const c of comments) {
    if (!byTask.has(c.taskId)) byTask.set(c.taskId, []);
    byTask.get(c.taskId)!.push(c);
  }
  return Array.from(byTask.entries()).map(([taskId, list]) => {
    const latest = list[0];
    return {
      taskId,
      count: list.length,
      latest: latest
        ? {
            id: latest.id,
            content: latest.content.slice(0, 100) + (latest.content.length > 100 ? "…" : ""),
            author: latest.author,
            createdAt: latest.createdAt,
            ...(latest.positionX != null && latest.positionY != null && {
              position: { x: latest.positionX, y: latest.positionY },
            }),
          }
        : undefined,
    };
  });
}

export async function update(commentId: string, userId: string, input: UpdateCommentInput) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    include: { task: { select: { projectId: true } } },
  });
  if (!comment) return null;
  const projectId = comment.task.projectId;
  const member = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!member) return null;
  if (input.content !== undefined && comment.authorId !== userId) return null;
  const data: { content?: string; resolved?: boolean } = {};
  if (input.content !== undefined) data.content = input.content;
  if (input.resolved !== undefined) data.resolved = input.resolved;
  if (Object.keys(data).length === 0) return comment;
  const updated = await db.$transaction(async (tx) => {
    const prev = await tx.comment.findUnique({ where: { id: commentId } });
    if (!prev) return null;
    const u = await tx.comment.update({
      where: { id: commentId },
      data,
    });
    const { id: eventId } = await appendEvent(tx, {
      boardId: projectId,
      type: BOARD_EVENT_TYPES.COMMENT_UPDATED,
      payload: { commentId, comment: u, previous: { content: prev.content, resolved: prev.resolved } },
      userId,
    });
    return { updated: u, eventId };
  });
  if (updated) {
    boardCache.invalidate(projectId);
    const withAuthor = await db.comment.findUnique({
      where: { id: commentId },
      include: { author: { select: { id: true, name: true, image: true } } },
    });
    publish(projectId, { type: BOARD_EVENT_TYPES.COMMENT_UPDATED, commentId, comment: withAuthor ?? updated.updated, eventId: updated.eventId });
  }
  const withAuthor = await db.comment.findUnique({
    where: { id: commentId },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
  return withAuthor ?? updated?.updated ?? null;
}

export async function remove(commentId: string, userId: string) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    include: { task: { select: { projectId: true } } },
  });
  if (!comment || comment.authorId !== userId) return false;
  const projectId = comment.task.projectId;
  let eventId: string | undefined;
  await db.$transaction(async (tx) => {
    await tx.comment.delete({ where: { id: commentId } });
    const result = await appendEvent(tx, {
      boardId: projectId,
      type: BOARD_EVENT_TYPES.COMMENT_DELETED,
      payload: { commentId, comment },
      userId,
    });
    eventId = result.id;
  });
  boardCache.invalidate(projectId);
  publish(projectId, { type: BOARD_EVENT_TYPES.COMMENT_DELETED, commentId, taskId: comment.taskId, eventId });
  return true;
}
