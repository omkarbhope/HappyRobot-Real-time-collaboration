/**
 * In-memory pub/sub for real-time broadcast per board.
 * Map<boardId, Set<WebSocket>>. Single-server only; for multi-server use Redis pub/sub.
 *
 * Uses a global singleton for the Map so that the custom server (which loads this file
 * directly) and the Next.js API routes (which get a bundled copy of this module) share
 * the same subscribers. Otherwise task events would publish to an empty Map and other
 * clients would never receive them, while cursors work because they're published from
 * the server process that holds the real WebSocket connections.
 */

export type WebSocketLike = { send(data: string): void; readyState: number };

const OPEN = 1;

const GLOBAL_KEY = "__happyrobot_realtime_subscribers";
function getSubscribers(): Map<string, Set<WebSocketLike>> {
  const g = globalThis as unknown as { [key: string]: Map<string, Set<WebSocketLike>> };
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map();
  return g[GLOBAL_KEY];
}

export function subscribe(boardId: string, ws: WebSocketLike): void {
  const subscribers = getSubscribers();
  let set = subscribers.get(boardId);
  if (!set) {
    set = new Set();
    subscribers.set(boardId, set);
  }
  set.add(ws);
}

export function unsubscribe(boardId: string, ws: WebSocketLike): void {
  const subscribers = getSubscribers();
  const set = subscribers.get(boardId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) subscribers.delete(boardId);
  }
}

export function publish(boardId: string, payload: Record<string, unknown>): void {
  const subscribers = getSubscribers();
  const set = subscribers.get(boardId);
  if (!set) return;
  let message: string;
  try {
    message = JSON.stringify(payload);
  } catch (err) {
    console.error("[realtime] publish JSON.stringify failed for boardId=%s:", boardId, err);
    return;
  }
  for (const ws of set) {
    try {
      if (ws.readyState === OPEN) ws.send(message);
    } catch {
      set.delete(ws);
    }
  }
}

export function getSubscriberCount(boardId: string): number {
  return getSubscribers().get(boardId)?.size ?? 0;
}
