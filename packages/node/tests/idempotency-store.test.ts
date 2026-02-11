/**
 * Tests for InMemoryIdempotencyStore lifecycle — size and clear().
 */

import { describe, it, expect } from "vitest";
import { InMemoryIdempotencyStore } from "../src/middleware/idempotency.js";

describe("InMemoryIdempotencyStore lifecycle", () => {
  it("size reflects number of cached entries", () => {
    const store = new InMemoryIdempotencyStore();

    expect(store.size).toBe(0);

    store.set("k1", {
      status: 200,
      body: "{}",
      headers: {},
      cachedAt: Date.now(),
    });
    expect(store.size).toBe(1);

    store.set("k2", {
      status: 201,
      body: '{"ok":true}',
      headers: {},
      cachedAt: Date.now(),
    });
    expect(store.size).toBe(2);
  });

  it("clear() removes all entries", () => {
    const store = new InMemoryIdempotencyStore();

    store.set("k1", {
      status: 200,
      body: "{}",
      headers: {},
      cachedAt: Date.now(),
    });
    store.set("k2", {
      status: 200,
      body: "{}",
      headers: {},
      cachedAt: Date.now(),
    });

    expect(store.size).toBe(2);

    store.clear();

    expect(store.size).toBe(0);
    expect(store.get("k1")).toBeUndefined();
    expect(store.get("k2")).toBeUndefined();
  });
});
