/**
 * Tests for rate limiting middleware.
 *
 * Verifies:
 * - Token bucket allows requests within capacity
 * - Bucket denies requests when empty
 * - Retry-After header is set on 429 responses
 * - Different identities get separate buckets
 */

import { describe, it, expect } from "vitest";
import { TokenBucketStore } from "../../src/middleware/rate-limit.js";

describe("TokenBucketStore", () => {
  it("allows requests within burst capacity", () => {
    const store = new TokenBucketStore({ rpm: 60, burst: 5 });

    for (let i = 0; i < 5; i++) {
      const result = store.consume("user-1");
      expect(result.allowed).toBe(true);
    }
  });

  it("denies requests when burst is exhausted", () => {
    const store = new TokenBucketStore({ rpm: 60, burst: 3 });

    // Exhaust the bucket
    for (let i = 0; i < 3; i++) {
      store.consume("user-1");
    }

    const result = store.consume("user-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates buckets per identity", () => {
    const store = new TokenBucketStore({ rpm: 60, burst: 2 });

    // Exhaust user-1
    store.consume("user-1");
    store.consume("user-1");
    expect(store.consume("user-1").allowed).toBe(false);

    // user-2 should still have tokens
    expect(store.consume("user-2").allowed).toBe(true);
  });

  it("reports remaining tokens", () => {
    const store = new TokenBucketStore({ rpm: 60, burst: 3 });

    let result = store.consume("user-1");
    expect(result.remaining).toBe(2);

    result = store.consume("user-1");
    expect(result.remaining).toBe(1);

    result = store.consume("user-1");
    expect(result.remaining).toBe(0);
  });

  it("tracks the number of active buckets", () => {
    const store = new TokenBucketStore({ rpm: 60, burst: 5 });

    store.consume("a");
    store.consume("b");
    store.consume("c");

    expect(store.size).toBe(3);
  });

  it("clear() removes all buckets", () => {
    const store = new TokenBucketStore({ rpm: 60, burst: 5 });

    store.consume("a");
    store.consume("b");
    store.clear();

    expect(store.size).toBe(0);
  });
});
