"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiPost } from "@/lib/api";
import type { InviteCode } from "@/types/board";

interface ShareDialogProps {
  projectId: string;
  isOwner: boolean;
}

export function ShareDialog({ projectId, isOwner }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    if (!isOwner) return;
    setOpen(true);
    if (code) return;
    setLoading(true);
    setError(null);
    const res = await apiPost<InviteCode>("/api/invite/create", { projectId });
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setCode(res.data.code);
    }
  };

  const copyLink = () => {
    if (!code) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard?join=${code}`;
    void navigator.clipboard.writeText(url);
  };

  const copyCode = () => {
    if (!code) return;
    void navigator.clipboard.writeText(code);
  };

  if (!isOwner) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        Share
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Generating code…</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {code && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Invite code</p>
                <p className="font-mono text-lg font-semibold">{code}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    Copy code
                  </Button>
                  <Button size="sm" onClick={copyLink}>
                    Copy link
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
