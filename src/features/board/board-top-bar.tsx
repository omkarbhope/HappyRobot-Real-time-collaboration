"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Tool } from "./board-store";
import { ShareDialog } from "@/features/invite/share-dialog";
import { PresencePopover } from "@/features/presence/presence-popover";
import { NotificationsDropdown } from "@/features/notifications/notifications-dropdown";
import { Map, Search, MessageCircle } from "lucide-react";

interface BoardTopBarProps {
  boardName: string;
  isOwner: boolean;
  onRename?: (name: string) => void;
  projectId: string;
  userImage?: string | null;
  userName?: string | null;
  showMinimap?: boolean;
  onToggleMinimap?: () => void;
  onOpenFindReplace?: () => void;
  onOpenComments?: () => void;
  onOpenCommentTask?: (taskId: string) => void;
  commentCount?: number;
}

export function BoardTopBar({
  boardName,
  isOwner,
  onRename,
  projectId,
  userImage,
  userName,
  showMinimap = true,
  onToggleMinimap,
  onOpenFindReplace,
  onOpenComments,
  onOpenCommentTask,
  commentCount = 0,
}: BoardTopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h1 className="truncate text-lg font-semibold">{boardName}</h1>
        {isOwner && onRename && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground"
            onClick={() => {
              const n = window.prompt("Board name", boardName);
              if (n != null && n.trim()) onRename(n.trim());
            }}
          >
            Rename
          </Button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onOpenComments && (
          <Button
            variant="ghost"
            size="icon"
            className="relative size-8"
            onClick={() => onOpenComments()}
            title="Comments"
          >
            <MessageCircle className="size-4" />
            {commentCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {commentCount > 99 ? "99+" : commentCount}
              </span>
            )}
          </Button>
        )}
        <NotificationsDropdown onOpenCommentTask={onOpenCommentTask} />
        {onOpenFindReplace && (
          <Button variant="ghost" size="icon" className="size-8" onClick={onOpenFindReplace} title="Find and Replace">
            <Search className="size-4" />
          </Button>
        )}
        {onToggleMinimap && (
          <Button
            variant={showMinimap ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={onToggleMinimap}
            title={showMinimap ? "Hide minimap" : "Show minimap"}
          >
            <Map className="size-4" />
          </Button>
        )}
        <ShareDialog projectId={projectId} isOwner={isOwner} />
        <PresencePopover />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userImage ?? undefined} alt={userName ?? ""} />
                <AvatarFallback>
                  {userName?.slice(0, 2).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
