"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBoardStore } from "@/features/board/board-store";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Comment } from "@/types/board";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, MessageCircle, CheckCircle2, Circle, AtSign } from "lucide-react";

type ProjectMemberUser = { id: string; name: string | null; image: string | null };

export function CommentsPanel() {
  const openTaskId = useBoardStore((s) => s.openCommentTaskId);
  const setOpenCommentTaskId = useBoardStore((s) => s.setOpenCommentTaskId);
  const commentsPanelOpen = useBoardStore((s) => s.commentsPanelOpen);
  const setCommentsPanelOpen = useBoardStore((s) => s.setCommentsPanelOpen);
  const commentsByTask = useBoardStore((s) => s.commentsByTask);
  const commentCountByTaskId = useBoardStore((s) => s.commentCountByTaskId);
  const nodes = useBoardStore((s) => s.nodes);
  const project = useBoardStore((s) => s.project);
  const setCommentsForTask = useBoardStore((s) => s.setCommentsForTask);
  const addOrUpdateComment = useBoardStore((s) => s.addOrUpdateComment);

  const [content, setContent] = useState("");
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);
  const [members, setMembers] = useState<ProjectMemberUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(true);

  const rawComments = openTaskId ? commentsByTask[openTaskId] ?? [] : [];
  const comments = showResolved ? rawComments : rawComments.filter((c) => !c.resolved);
  const taskIdsWithComments = Object.entries(commentCountByTaskId)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const getNodeLabel = (taskId: string) => {
    const node = nodes.find((n) => n.id === taskId);
    const data = node?.data as { label?: string } | undefined;
    return data?.label ?? "Block";
  };

  useEffect(() => {
    if (!openTaskId) return;
    setLoading(true);
    setError(null);
    apiGet<Comment[]>(`/api/comments?taskId=${openTaskId}`).then((res) => {
      setLoading(false);
      if (res.data) setCommentsForTask(openTaskId, res.data);
      if (res.error) setError(res.error);
    });
  }, [openTaskId, setCommentsForTask]);

  useEffect(() => {
    if (!project?.id) return;
    apiGet<ProjectMemberUser[]>(`/api/projects/${project.id}/members`).then((res) => {
      if (res.data) setMembers(res.data);
    });
  }, [project?.id]);

  const addMention = (user: ProjectMemberUser) => {
    const name = user.name?.trim() || "Someone";
    setContent((prev) => (prev ? `${prev} @${name}` : `@${name}`));
    setMentionUserIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openTaskId || !content.trim()) return;
    setPosting(true);
    setError(null);
    const res = await apiPost<Comment>("/api/comments", {
      taskId: openTaskId,
      content: content.trim(),
      ...(mentionUserIds.length > 0 && { mentionUserIds }),
    });
    setPosting(false);
    if (res.data) {
      addOrUpdateComment(openTaskId, res.data);
      setContent("");
      setMentionUserIds([]);
    }
    if (res.error) setError(res.error);
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    const res = await apiPatch<Comment>(`/api/comments/${commentId}`, { resolved });
    if (res.data && openTaskId) {
      addOrUpdateComment(openTaskId, res.data);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCommentsPanelOpen(false);
      setOpenCommentTaskId(null);
    }
  };

  const isListViewModel = commentsPanelOpen && !openTaskId;
  const isThreadView = commentsPanelOpen && !!openTaskId;

  return (
    <Sheet open={commentsPanelOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {isThreadView && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setOpenCommentTaskId(null)}
                title="All comments"
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}
            <SheetTitle>
              {isThreadView ? `Comments on ${getNodeLabel(openTaskId!)}` : "Comments"}
            </SheetTitle>
          </div>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-4">
          {isListViewModel && (
            <>
              {taskIdsWithComments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet. Right‑click a block and choose Comment to add one.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {taskIdsWithComments.map(([taskId, count]) => (
                    <li key={taskId}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 font-normal"
                        onClick={() => setOpenCommentTaskId(taskId)}
                      >
                        <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate">{getNodeLabel(taskId)}</span>
                        <span className="shrink-0 text-muted-foreground">({count})</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {isThreadView && (
            <>
              {rawComments.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showResolved}
                    onChange={(e) => setShowResolved(e.target.checked)}
                    className="rounded border-input"
                  />
                  Show resolved
                </label>
              )}
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {comments.map((c) => (
                    <li
                      key={c.id}
                      className={cn(
                        "flex gap-2 rounded-lg border p-2",
                        c.resolved && "opacity-75"
                      )}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={c.author?.image ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {c.author?.name?.slice(0, 2).toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {c.author?.name ?? "Anonymous"}
                          </p>
                          {c.resolved && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              <CheckCircle2 className="size-3" />
                              Resolved
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {c.content}
                        </p>
                        <div className="mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleResolve(c.id, !c.resolved)}
                          >
                            {c.resolved ? (
                              <>
                                <Circle className="size-3 mr-1" />
                                Reopen
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-3 mr-1" />
                                Resolve
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <div className="flex gap-1">
                  <Textarea
                    placeholder="Add a comment… (use @ to mention)"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={3}
                    maxLength={5000}
                    className="min-w-0 flex-1"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="shrink-0" title="Mention someone">
                        <AtSign className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {members.map((user) => (
                        <DropdownMenuItem
                          key={user.id}
                          onClick={() => addMention(user)}
                          disabled={mentionUserIds.includes(user.id)}
                        >
                          <Avatar className="mr-2 h-5 w-5">
                            <AvatarImage src={user.image ?? undefined} />
                            <AvatarFallback className="text-[10px]">{user.name?.slice(0, 2).toUpperCase() ?? "?"}</AvatarFallback>
                          </Avatar>
                          {user.name || "Unknown"}
                        </DropdownMenuItem>
                      ))}
                      {members.length === 0 && (
                        <DropdownMenuItem disabled>No members</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={posting || !content.trim()}>
                  {posting ? "Sending…" : "Send"}
                </Button>
              </form>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
