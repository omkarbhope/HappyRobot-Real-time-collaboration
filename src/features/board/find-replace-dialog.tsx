"use client";

import { useState, useMemo, useCallback } from "react";
import { useBoardStore } from "@/features/board/board-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPatch } from "@/lib/api";
import type { Task } from "@/types/board";
import { getTaskTypeFromNode } from "@/features/board/tool-registry";
import { toast } from "sonner";

function stripHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? "";
}

interface Match {
  nodeId: string;
  field: "label" | "contentHtml";
  nodeIndex: number;
}

interface FindReplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FindReplaceDialog({ open, onOpenChange }: FindReplaceDialogProps) {
  const nodes = useBoardStore((s) => s.nodes);
  const setNodes = useBoardStore((s) => s.setNodes);
  const addOrUpdateTask = useBoardStore((s) => s.addOrUpdateTask);
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const matches = useMemo((): Match[] => {
    if (!find.trim()) return [];
    const lower = find.toLowerCase();
    const list: Match[] = [];
    nodes.forEach((node, nodeIndex) => {
      const d = node.data as { label?: string; contentHtml?: string };
      const label = (d?.label ?? "").toString();
      if (label.toLowerCase().includes(lower)) {
        list.push({ nodeId: node.id, field: "label", nodeIndex });
      }
      const html = (d?.contentHtml ?? "").toString();
      if (html && stripHtml(html).toLowerCase().includes(lower)) {
        list.push({ nodeId: node.id, field: "contentHtml", nodeIndex });
      }
    });
    return list;
  }, [nodes, find]);

  const selectMatch = useCallback(
    (index: number) => {
      if (matches.length === 0) return;
      const i = ((index % matches.length) + matches.length) % matches.length;
      setCurrentIndex(i);
      const m = matches[i];
      setNodes((prev) =>
        prev.map((n) => ({ ...n, selected: n.id === m.nodeId }))
      );
    },
    [matches, setNodes]
  );

  const doReplace = useCallback(
    async (match: Match, newValue: string) => {
      const node = nodes.find((n) => n.id === match.nodeId);
      if (!node) return;
      const d = node.data as Record<string, unknown>;
      if (match.field === "label") {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === match.nodeId ? { ...n, data: { ...n.data, label: newValue } } : n
          )
        );
        const configType = getTaskTypeFromNode(node);
        const pos = node.position ?? { x: 0, y: 0 };
        const w = (d?.width as number) ?? 200;
        const h = (d?.height as number) ?? 120;
        const res = await apiPatch<Task>(`/api/tasks/${match.nodeId}`, {
          title: newValue,
          configuration: { type: configType, position: pos, size: { w, h } },
        });
        if (res.data) addOrUpdateTask(res.data);
        else toast.error(res.error ?? "Failed to update");
      } else {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === match.nodeId ? { ...n, data: { ...n.data, contentHtml: newValue } } : n
          )
        );
        const configType = getTaskTypeFromNode(node);
        const pos = node.position ?? { x: 0, y: 0 };
        const w = (d?.width as number) ?? 200;
        const h = (d?.height as number) ?? 120;
        const res = await apiPatch<Task>(`/api/tasks/${match.nodeId}`, {
          configuration: { type: configType, position: pos, size: { w, h }, contentHtml: newValue },
        });
        if (res.data) addOrUpdateTask(res.data);
        else toast.error(res.error ?? "Failed to update");
      }
    },
    [nodes, setNodes, addOrUpdateTask]
  );

  const replaceInText = (text: string, findStr: string, replaceStr: string): string => {
    const re = new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return text.replace(re, replaceStr);
  };

  const handleReplace = useCallback(() => {
    if (matches.length === 0) return;
    const m = matches[currentIndex];
    const node = nodes.find((n) => n.id === m.nodeId);
    if (!node) return;
    const d = node.data as Record<string, unknown>;
    const current = m.field === "label" ? (d?.label as string) ?? "" : stripHtml((d?.contentHtml as string) ?? "");
    const newValue = m.field === "label" ? replaceInText((d?.label as string) ?? "", find, replace) : (d?.contentHtml as string)?.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), replace) ?? "";
    doReplace(m, newValue);
    if (currentIndex < matches.length - 1) selectMatch(currentIndex + 1);
  }, [matches, currentIndex, find, replace, nodes, doReplace, selectMatch]);

  const handleReplaceAll = useCallback(async () => {
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const node = nodes.find((n) => n.id === m.nodeId);
      if (!node) continue;
      const d = node.data as Record<string, unknown>;
      if (m.field === "label") {
        const newValue = replaceInText((d?.label as string) ?? "", find, replace);
        await doReplace(m, newValue);
      } else {
        const html = (d?.contentHtml as string) ?? "";
        const newValue = html.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), replace);
        await doReplace(m, newValue);
      }
    }
    toast.success(`Replaced ${matches.length} occurrence(s)`);
    onOpenChange(false);
  }, [matches, find, replace, nodes, doReplace, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find and Replace</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Find</label>
            <Input
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Search in labels and content..."
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Replace with</label>
            <Input
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replace with..."
            />
          </div>
          {find.trim() && (
            <p className="text-xs text-muted-foreground">
              {matches.length} match(es) found
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => selectMatch(currentIndex + 1)}
            disabled={matches.length === 0}
          >
            Find next
          </Button>
          <Button
            variant="outline"
            onClick={handleReplace}
            disabled={matches.length === 0}
          >
            Replace
          </Button>
          <Button
            onClick={handleReplaceAll}
            disabled={matches.length === 0}
          >
            Replace all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
