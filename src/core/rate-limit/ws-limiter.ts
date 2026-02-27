import {
  WS_RATE_LIMIT_WINDOW_MS,
  WS_RATE_LIMIT_MAX_MESSAGES,
} from "@/shared/constants";

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

/**
 * Check WS message rate limit per connection. Returns true if allowed, false if over limit.
 * connectionId should be unique per WebSocket (e.g. nanoid when connection opens).
 */
export function checkWsRateLimit(connectionId: string): boolean {
  const now = Date.now();
  let entry = store.get(connectionId);
  if (!entry) {
    entry = { count: 1, resetAt: now + WS_RATE_LIMIT_WINDOW_MS };
    store.set(connectionId, entry);
    return true;
  }
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + WS_RATE_LIMIT_WINDOW_MS;
    return true;
  }
  entry.count++;
  return entry.count <= WS_RATE_LIMIT_MAX_MESSAGES;
}

/** Call when connection closes to free memory. */
export function clearWsRateLimit(connectionId: string): void {
  store.delete(connectionId);
}
