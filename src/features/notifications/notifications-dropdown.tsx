"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiGet, apiPatch } from "@/lib/api";
import { Bell } from "lucide-react";

export type NotificationItem = {
  id: string;
  type: string;
  commentId: string;
  taskId: string;
  read: boolean;
  createdAt: string;
  commentPreview?: { contentPreview: string; authorName: string };
};

interface NotificationsDropdownProps {
  onOpenCommentTask?: (taskId: string) => void;
}

export function NotificationsDropdown({ onOpenCommentTask }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiGet<NotificationItem[]>("/api/notifications?limit=20").then((res) => {
      setLoading(false);
      if (res.data) setList(res.data);
    });
  }, [open]);

  // Fetch on mount so the unread badge is correct
  useEffect(() => {
    apiGet<NotificationItem[]>("/api/notifications?limit=50").then((res) => {
      if (res.data) setList(res.data);
    });
  }, []);

  const unreadCount = list.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await apiPatch(`/api/notifications/${id}`, { read: true });
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllRead = async () => {
    await apiPatch("/api/notifications/read-all", {});
    setList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleSelect = (n: NotificationItem) => {
    if (!n.read) handleMarkRead(n.id);
    onOpenCommentTask?.(n.taskId);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8" title="Notifications">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          <>
            {list.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleSelect(n)}
                className={n.read ? "opacity-75" : ""}
              >
                <div className="flex flex-col gap-0.5 py-0.5">
                  <span className="text-xs font-medium">
                    {n.commentPreview?.authorName ?? "Someone"} mentioned you
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {n.commentPreview?.contentPreview ?? "Comment"}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            {unreadCount > 0 && (
              <DropdownMenuItem onClick={handleMarkAllRead} className="border-t">
                Mark all as read
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
