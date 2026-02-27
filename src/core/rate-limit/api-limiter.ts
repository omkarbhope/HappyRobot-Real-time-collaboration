import {
  API_RATE_LIMIT_WINDOW_MS,
  API_RATE_LIMIT_MAX_REQUESTS,
} from "@/shared/constants";

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

function getKey(identifier: string): string {
  return `api:${identifier}`;
}

/**
 * Check rate limit. Returns true if allowed, false if over limit.
 * Identifier is typically userId or IP.
 */
export function checkApiRateLimit(identifier: string): boolean {
  const key = getKey(identifier);
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { count: 1, resetAt: now + API_RATE_LIMIT_WINDOW_MS };
    store.set(key, entry);
    return true;
  }
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + API_RATE_LIMIT_WINDOW_MS;
    return true;
  }
  entry.count++;
  return entry.count <= API_RATE_LIMIT_MAX_REQUESTS;
}

/** Returns seconds until reset (for Retry-After header). */
export function getApiRateLimitRetryAfter(identifier: string): number {
  const entry = store.get(getKey(identifier));
  if (!entry) return 0;
  const remaining = Math.ceil((entry.resetAt - Date.now()) / 1000);
  return Math.max(0, remaining);
}
