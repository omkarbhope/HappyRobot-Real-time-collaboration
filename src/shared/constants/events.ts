export const BOARD_EVENT_TYPES = {
  PROJECT_CREATED: "project.created",
  PROJECT_UPDATED: "project.updated",
  PROJECT_DELETED: "project.deleted",
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_DELETED: "task.deleted",
  COMMENT_ADDED: "comment.added",
  COMMENT_UPDATED: "comment.updated",
  COMMENT_DELETED: "comment.deleted",
  UNDO: "undo",
} as const;

export type BoardEventType = (typeof BOARD_EVENT_TYPES)[keyof typeof BOARD_EVENT_TYPES];
