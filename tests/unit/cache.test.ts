import { describe, it, expect, vi, beforeEach } from "vitest";
import { boardCache } from "@/core/cache";

describe("Board cache", () => {
  beforeEach(() => {
    boardCache.invalidate("board-1");
    boardCache.invalidate("board-2");
  });

  it("returns null when key is missing", () => {
    expect(boardCache.get("board-1")).toBeNull();
  });

  it("returns set value", () => {
    boardCache.set("board-1", { name: "Test", events: [] });
    expect(boardCache.get<{ name: string }>("board-1")).toEqual({ name: "Test", events: [] });
  });

  it("invalidates key", () => {
    boardCache.set("board-1", { x: 1 });
    boardCache.invalidate("board-1");
    expect(boardCache.get("board-1")).toBeNull();
  });

  it("returns null after TTL expires", () => {
    vi.useFakeTimers();
    boardCache.set("board-1", { x: 1 }, 1000);
    expect(boardCache.get("board-1")).toEqual({ x: 1 });
    vi.advanceTimersByTime(1001);
    expect(boardCache.get("board-1")).toBeNull();
    vi.useRealTimers();
  });
});
