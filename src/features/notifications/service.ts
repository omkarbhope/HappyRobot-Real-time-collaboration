import { db } from "@/core/db/client";

const NOTIFICATION_TYPE_COMMENT_MENTION = "comment_mention";

export async function createForCommentMention(
  userId: string,
  commentId: string,
  taskId: string
) {
  await db.notification.create({
    data: {
      userId,
      type: NOTIFICATION_TYPE_COMMENT_MENTION,
      commentId,
      taskId,
    },
  });
}

export async function listByUser(userId: string, limit = 50) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** List notifications with comment preview (content slice, author) for display. */
export async function listByUserWithPreviews(userId: string, limit = 50) {
  const list = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  if (list.length === 0) return [];
  const commentIds = [...new Set(list.map((n) => n.commentId))];
  const comments = await db.comment.findMany({
    where: { id: { in: commentIds } },
    select: { id: true, content: true, authorId: true },
  });
  const authorIds = [...new Set(comments.map((c) => c.authorId))];
  const users = await db.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const commentMap = Object.fromEntries(
    comments.map((c) => [
      c.id,
      {
        contentPreview: c.content.slice(0, 120),
        authorName: userMap[c.authorId]?.name ?? "Someone",
      },
    ])
  );
  return list.map((n) => ({
    ...n,
    commentPreview: commentMap[n.commentId],
  }));
}

export async function markRead(notificationId: string, userId: string) {
  const n = await db.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!n) return false;
  await db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
  return true;
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({
    where: { userId },
    data: { read: true },
  });
}
