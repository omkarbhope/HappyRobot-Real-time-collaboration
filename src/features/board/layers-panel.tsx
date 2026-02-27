"use client";

import { useState } from "react";
import { useBoardStore, type BoardLayer } from "@/features/board/board-store";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Plus, Layers, MoveRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/api";
import type { Project, Task } from "@/types/board";
import { toast } from "sonner";

export function LayersPanel() {
  const project = useBoardStore((s) => s.project);
  const nodes = useBoardStore((s) => s.nodes);
  const layers = useBoardStore((s) => s.layers);
  const nodeLayerId = useBoardStore((s) => s.nodeLayerId);
  const setLayers = useBoardStore((s) => s.setLayers);
  const setNodeLayerId = useBoardStore((s) => s.setNodeLayerId);
  const setActiveLayerId = useBoardStore((s) => s.setActiveLayerId);
  const activeLayerId = useBoardStore((s) => s.activeLayerId);
  const toggleLayerVisibility = useBoardStore((s) => s.toggleLayerVisibility);

  const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
  const [movingToLayerId, setMovingToLayerId] = useState<string | null>(null);

  const handleMoveSelectionToLayer = async (targetLayerId: string) => {
    if (selectedNodeIds.length === 0 || !project?.id) return;
    const prevLayerIds = selectedNodeIds.map((id) => ({
      id,
      layerId: nodeLayerId[id] ?? "default",
    }));
    selectedNodeIds.forEach((id) => setNodeLayerId(id, targetLayerId));
    setMovingToLayerId(targetLayerId);

    const getResults = await Promise.all(
      selectedNodeIds.map((id) => apiGet<Task>(`/api/tasks/${id}`))
    );
    const tasks = getResults
      .map((r, i) => (r.data ? { id: selectedNodeIds[i], task: r.data } : null))
      .filter((x): x is { id: string; task: Task } => x !== null);

    if (tasks.length !== selectedNodeIds.length) {
      toast.error("Failed to move some items to layer");
      prevLayerIds.forEach(({ id, layerId }) => setNodeLayerId(id, layerId));
      setMovingToLayerId(null);
      return;
    }

    const patchResults = await Promise.all(
      tasks.map(({ id, task }) =>
        apiPatch<Task>(`/api/tasks/${id}`, {
          configuration: {
            ...(task.configuration ?? {}),
            layerId: targetLayerId,
          },
        })
      )
    );
    const hasError = patchResults.some((r) => r.error);
    setMovingToLayerId(null);
    if (hasError) {
      toast.error("Failed to move some items to layer");
      prevLayerIds.forEach(({ id, layerId }) => setNodeLayerId(id, layerId));
    }
  };

  const handleAddLayer = () => {
    const newLayer: BoardLayer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      order: layers.length,
    };
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    if (!project?.id) return;
    apiPatch<Project>(`/api/projects/${project.id}`, {
      metadata: { ...project.metadata, layers: newLayers },
    }).then((res) => {
      if (res.error) {
        toast.error(res.error ?? "Failed to add layer");
        setLayers(layers);
      }
    });
  };

  const handleToggleVisibility = (layerId: string) => {
    const newLayers = layers.map((l) =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    );
    setLayers(newLayers);
    if (!project?.id) return;
    apiPatch<Project>(`/api/projects/${project.id}`, {
      metadata: { ...project.metadata, layers: newLayers },
    }).then((res) => {
      if (res.error) {
        toast.error(res.error ?? "Failed to update layer");
        setLayers(layers);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-background/95 p-2 shadow-md backdrop-blur min-w-[160px]">
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Layers className="size-3" />
          Layers
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={handleAddLayer}
          title="Add layer"
          disabled={!project?.id}
        >
          <Plus className="size-3" />
        </Button>
      </div>
      <div className="flex flex-col gap-0.5">
        {layers
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((layer: BoardLayer) => (
            <div
              key={layer.id}
              role="button"
              tabIndex={0}
              className={cn(
                "flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/80 cursor-pointer",
                !layer.visible && "opacity-60",
                activeLayerId === layer.id && "bg-accent"
              )}
              onClick={() => setActiveLayerId(layer.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveLayerId(layer.id);
                }
              }}
              title={`Draw on ${layer.name}`}
            >
              <button
                type="button"
                className="shrink-0 rounded p-0.5 hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleVisibility(layer.id);
                }}
                title={layer.visible ? "Hide layer" : "Show layer"}
                aria-label={layer.visible ? "Hide layer" : "Show layer"}
              >
                {layer.visible ? (
                  <Eye className="size-3.5 text-muted-foreground" />
                ) : (
                  <EyeOff className="size-3.5 text-muted-foreground" />
                )}
              </button>
              <span className="truncate flex-1">{layer.name}</span>
            </div>
          ))}
      </div>
      {selectedNodeIds.length > 0 && (
        <div className="mt-2 border-t border-border pt-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <MoveRight className="size-3" />
            Move selection
          </p>
          <div className="flex flex-col gap-0.5">
            {layers
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((layer: BoardLayer) => (
                <button
                  key={layer.id}
                  type="button"
                  disabled={movingToLayerId !== null}
                  className={cn(
                    "rounded px-2 py-1.5 text-left text-xs hover:bg-muted/80 disabled:opacity-50",
                    movingToLayerId === layer.id && "bg-muted/80"
                  )}
                  onClick={() => handleMoveSelectionToLayer(layer.id)}
                  title={`Move ${selectedNodeIds.length} item(s) to ${layer.name}`}
                >
                  To {layer.name}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
