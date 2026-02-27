import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkWsRateLimit, clearWsRateLimit } from "@/core/rate-limit/ws-limiter";

describe("WS rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows messages under the limit", () => {
    const connId = "conn-1";
    expect(checkWsRateLimit(connId)).toBe(true);
    expect(checkWsRateLimit(connId)).toBe(true);
  });

  it("returns false when over limit", () => {
    const connId = "conn-2";
    for (let i = 0; i < 30; i++) expect(checkWsRateLimit(connId)).toBe(true);
    expect(checkWsRateLimit(connId)).toBe(false);
  });

  it("clears state when connection closes", () => {
    const connId = "conn-3";
    for (let i = 0; i < 31; i++) checkWsRateLimit(connId);
    expect(checkWsRateLimit(connId)).toBe(false);
    clearWsRateLimit(connId);
    expect(checkWsRateLimit(connId)).toBe(true);
  });

  vi.useRealTimers();
});
