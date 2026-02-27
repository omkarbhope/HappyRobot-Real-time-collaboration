import { BOARD_CACHE_TTL_MS } from "@/shared/constants";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export const boardCache = {
  get<T>(boardId: string): T | null {
    const entry = cache.get(boardId) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(boardId);
      return null;
    }
    return entry.data;
  },

  set<T>(boardId: string, data: T, ttlMs: number = BOARD_CACHE_TTL_MS): void {
    cache.set(boardId, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  },

  invalidate(boardId: string): void {
    cache.delete(boardId);
    cache.delete(`events:${boardId}:0:50`);
  },
};
