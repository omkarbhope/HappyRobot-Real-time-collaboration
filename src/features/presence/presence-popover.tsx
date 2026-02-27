"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBoardStore } from "@/features/board/board-store";

export function PresencePopover() {
  const presence = useBoardStore((s) => s.presence);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Who&apos;s here ({presence.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {presence.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No one else here</p>
        ) : (
          <div className="flex flex-wrap gap-2 p-3">
            {presence.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-2 rounded-md border px-2 py-1"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {user.name?.slice(0, 2).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{user.name ?? "Anonymous"}</span>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
