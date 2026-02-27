import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkApiRateLimit, getApiRateLimitRetryAfter } from "@/core/rate-limit/api-limiter";
import { API_RATE_LIMIT_MAX_REQUESTS } from "@/shared/constants";

describe("API rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests under the limit", () => {
    const id = "user-1";
    expect(checkApiRateLimit(id)).toBe(true);
    expect(checkApiRateLimit(id)).toBe(true);
    expect(checkApiRateLimit(id)).toBe(true);
  });

  it("returns false when over limit within window", () => {
    const id = "user-2";
    for (let i = 0; i < API_RATE_LIMIT_MAX_REQUESTS; i++) {
      expect(checkApiRateLimit(id)).toBe(true);
    }
    expect(checkApiRateLimit(id)).toBe(false);
    expect(checkApiRateLimit(id)).toBe(false);
  });

  it("resets after window expires", () => {
    const id = "user-3";
    for (let i = 0; i < API_RATE_LIMIT_MAX_REQUESTS; i++) checkApiRateLimit(id);
    expect(checkApiRateLimit(id)).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(checkApiRateLimit(id)).toBe(true);
  });

  it("returns retry-after seconds when over limit", () => {
    const id = "user-4";
    for (let i = 0; i < API_RATE_LIMIT_MAX_REQUESTS + 1; i++) checkApiRateLimit(id);
    const retry = getApiRateLimitRetryAfter(id);
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(60);
  });

  vi.useRealTimers();
});
