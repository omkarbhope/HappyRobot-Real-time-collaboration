import { apiPatch } from "@/lib/api";
import type { Task } from "@/types/board";
import type { ApiResponse } from "@/shared/types/api";

const DEBOUNCE_MS = 500;

type PatchBody = Record<string, unknown>;

interface Pending {
  body: PatchBody;
  timeoutId: ReturnType<typeof setTimeout>;
}

const pendingByTaskId = new Map<string, Pending>();

// #region agent log
const MODULE_INSTANCE_ID = Math.random().toString(36).slice(2, 10);
// #endregion

export type TaskPatchResultHandler = (taskId: string, res: ApiResponse<Task>) => void;

/**
 * Returns a debounced PATCH function for task updates. For each taskId, only the
 * latest body is sent after DEBOUNCE_MS of no further updates. Reduces 429s when
 * many updates fire in quick succession (e.g. sticky blur, resize, drag).
 */
export function getDebouncedTaskPatch(onResult: TaskPatchResultHandler) {
  function flush(taskId: string) {
    const pending = pendingByTaskId.get(taskId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    // #region agent log
    const pendingSizeBefore = pendingByTaskId.size;
    fetch('http://127.0.0.1:7242/ingest/e985d5a4-0cfa-4f89-88df-878213bbc18c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debounced-task-patch.ts:flush',message:'flush',data:{taskId,moduleId:MODULE_INSTANCE_ID,pendingSizeBefore},timestamp:Date.now(),hypothesisId:'H1_H2'})}).catch(()=>{});
    // #endregion
    pendingByTaskId.delete(taskId);
    apiPatch<Task>(`/api/tasks/${taskId}`, pending.body).then((res) => {
      onResult(taskId, res);
    });
  }

  function schedule(taskId: string, body: PatchBody) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e985d5a4-0cfa-4f89-88df-878213bbc18c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debounced-task-patch.ts:schedule',message:'schedule',data:{taskId,moduleId:MODULE_INSTANCE_ID,pendingSizeBefore:pendingByTaskId.size},timestamp:Date.now(),hypothesisId:'H1_H2_H4'})}).catch(()=>{});
    // #endregion
    const existing = pendingByTaskId.get(taskId);
    if (existing) clearTimeout(existing.timeoutId);
    const timeoutId = setTimeout(() => flush(taskId), DEBOUNCE_MS);
    pendingByTaskId.set(taskId, { body, timeoutId });
  }

  return function patchTaskDebounced(taskId: string, body: PatchBody) {
    if (taskId.startsWith("temp-")) return;
    schedule(taskId, body);
  };
}
