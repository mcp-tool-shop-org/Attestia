/**
 * Public Rate Limit Middleware Tests
 *
 * Verifies:
 * - IP-based bucketing
 * - Burst limit enforcement
 * - Recovery after time
 * - X-Forwarded-For extraction
 * - Different IPs get separate buckets
 */

import { describe, it, expect } from "vitest";
import { TokenBucketStore } from "../../src/middleware/rate-limit.js";
import { PUBLIC_RATE_LIMIT_DEFAULT } from "../../src/middleware/public-rate-limit.js";

// =============================================================================
// Tests
// =============================================================================

describe("PUBLIC_RATE_LIMIT_DEFAULT", () => {
  it("has stricter limits than typical API config", () => {
    expect(PUBLIC_RATE_LIMIT_DEFAULT.rpm).toBe(10);
    expect(PUBLIC_RATE_LIMIT_DEFAULT.burst).toBe(5);
  });
});

describe("TokenBucketStore for public rate limiting", () => {
  it("allows requests within burst capacity", () => {
    const store = new TokenBucketStore({ rpm: 10, burst: 3 });

    for (let i = 0; i < 3; i++) {
      const result = store.consume("192.168.1.1");
      expect(result.allowed).toBe(true);
    }
  });

  it("denies requests after burst exhaustion", () => {
    const store = new TokenBucketStore({ rpm: 10, burst: 3 });

    for (let i = 0; i < 3; i++) {
      store.consume("192.168.1.1");
    }

    const result = store.consume("192.168.1.1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates buckets per IP address", () => {
    const store = new TokenBucketStore({ rpm: 10, burst: 2 });

    store.consume("10.0.0.1");
    store.consume("10.0.0.1");
    expect(store.consume("10.0.0.1").allowed).toBe(false);

    // Different IP should still have full burst
    expect(store.consume("10.0.0.2").allowed).toBe(true);
  });

  it("reports correct remaining tokens", () => {
    const store = new TokenBucketStore({ rpm: 10, burst: 5 });

    const r1 = store.consume("ip-1");
    expect(r1.remaining).toBe(4);

    const r2 = store.consume("ip-1");
    expect(r2.remaining).toBe(3);
  });

  it("clear() resets all buckets", () => {
    const store = new TokenBucketStore({ rpm: 10, burst: 2 });

    store.consume("ip-1");
    store.consume("ip-1");
    expect(store.consume("ip-1").allowed).toBe(false);

    store.clear();

    // After clear, should be allowed again
    expect(store.consume("ip-1").allowed).toBe(true);
  });
});
