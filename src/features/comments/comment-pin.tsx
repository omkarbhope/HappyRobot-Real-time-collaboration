"use client";

import { MessageCircle } from "lucide-react";
import { useBoardStore } from "@/features/board/board-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Comment } from "@/types/board";

const EMPTY_COMMENTS: Comment[] = [];

interface CommentPinProps {
  taskId: string;
  className?: string;
}

/** Pin shown on a block when it has comments. Click opens the comments panel for this task. */
export function CommentPin({ taskId, className }: CommentPinProps) {
  const commentCount = useBoardStore((s) => s.commentCountByTaskId?.[taskId] ?? 0);
  const comments = useBoardStore((s) => s.commentsByTask[taskId] ?? EMPTY_COMMENTS);
  const position = useBoardStore((s) => s.commentPositionByTaskId?.[taskId]);
  const setOpenCommentTaskId = useBoardStore((s) => s.setOpenCommentTaskId);
  const setCommentsPanelOpen = useBoardStore((s) => s.setCommentsPanelOpen);

  if (commentCount === 0) return null;

  const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;
  const author = latestComment?.author;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenCommentTaskId(taskId);
    setCommentsPanelOpen(true);
  };

  const positionStyle = position
    ? { left: position.x, top: position.y }
    : { right: 4, top: 4 };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "absolute flex items-center gap-0.5 rounded-md border border-amber-300/80 bg-amber-50/95 px-1.5 py-0.5 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-600/50 dark:bg-amber-950/90 dark:hover:bg-amber-900/90",
        className
      )}
      style={positionStyle}
      title={`${commentCount} comment${commentCount !== 1 ? "s" : ""}`}
    >
      {author?.image || author?.name ? (
        <Avatar className="h-4 w-4 shrink-0">
          <AvatarImage src={author?.image ?? undefined} className="object-cover" />
          <AvatarFallback className="text-[8px]">
            {author?.name?.slice(0, 2).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
      ) : (
        <MessageCircle className="size-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
      )}
      <span className="text-xs font-medium text-amber-800 dark:text-amber-200">{commentCount}</span>
    </button>
  );
}
