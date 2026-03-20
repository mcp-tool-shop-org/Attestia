/**
 * Tests for idempotency middleware.
 *
 * Verifies:
 * - POST with Idempotency-Key caches the response
 * - Replayed response includes X-Idempotent-Replay header
 * - GET requests bypass idempotency
 * - POST without key bypasses idempotency
 * - TTL expiry evicts cached entries
 */

import { describe, it, expect } from "vitest";
import { createTestApp, jsonRequest } from "../setup.js";

describe("idempotency middleware", () => {
  it("returns cached response for duplicate POST with same key", async () => {
    const { app } = createTestApp();

    const body = {
      id: "idem-1",
      kind: "transfer",
      description: "Idempotency test",
      params: {},
    };

    // First request
    const res1 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body, {
        "Idempotency-Key": "key-123",
      }),
    );
    expect(res1.status).toBe(201);
    expect(res1.headers.get("X-Idempotent-Replay")).toBeNull();

    // Second request with same key
    const res2 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body, {
        "Idempotency-Key": "key-123",
      }),
    );
    expect(res2.status).toBe(201);
    expect(res2.headers.get("X-Idempotent-Replay")).toBe("true");

    const body1 = await res1.json();
    const body2 = await res2.json();
    expect(body2).toEqual(body1);
  });

  it("does not cache GET requests", async () => {
    const { app } = createTestApp();

    const res1 = await app.request(
      jsonRequest("/api/v1/intents", "GET", undefined, {
        "Idempotency-Key": "get-key",
      }),
    );
    const res2 = await app.request(
      jsonRequest("/api/v1/intents", "GET", undefined, {
        "Idempotency-Key": "get-key",
      }),
    );

    expect(res1.headers.get("X-Idempotent-Replay")).toBeNull();
    expect(res2.headers.get("X-Idempotent-Replay")).toBeNull();
  });

  it("does not cache POST without Idempotency-Key", async () => {
    const { app } = createTestApp();

    const body = {
      id: "no-key-1",
      kind: "transfer",
      description: "No key",
      params: {},
    };

    const res = await app.request(
      jsonRequest("/api/v1/intents", "POST", body),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("X-Idempotent-Replay")).toBeNull();
  });

  it("different keys get different cached responses", async () => {
    const { app } = createTestApp();

    const res1 = await app.request(
      jsonRequest(
        "/api/v1/intents",
        "POST",
        {
          id: "diff-1",
          kind: "transfer",
          description: "Key A",
          params: {},
        },
        { "Idempotency-Key": "key-a" },
      ),
    );

    const res2 = await app.request(
      jsonRequest(
        "/api/v1/intents",
        "POST",
        {
          id: "diff-2",
          kind: "swap",
          description: "Key B",
          params: {},
        },
        { "Idempotency-Key": "key-b" },
      ),
    );

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const body1 = (await res1.json()) as { data: { id: string } };
    const body2 = (await res2.json()) as { data: { id: string } };
    expect(body1.data.id).toBe("diff-1");
    expect(body2.data.id).toBe("diff-2");
  });
});

describe("InMemoryIdempotencyStore", () => {
  it("evicts expired entries on get()", async () => {
    const { idempotencyStore } = createTestApp();

    // Manually set an expired entry
    idempotencyStore.set("expired-key", {
      status: 200,
      body: "{}",
      headers: {},
      cachedAt: Date.now() - 100_000_000, // well past TTL
      bodyHash: "0".repeat(64),
    });

    expect(idempotencyStore.get("expired-key")).toBeUndefined();
  });

  it("returns entry within TTL", () => {
    const { idempotencyStore } = createTestApp();

    idempotencyStore.set("fresh-key", {
      status: 200,
      body: '{"ok":true}',
      headers: {},
      cachedAt: Date.now(),
      bodyHash: "0".repeat(64),
    });

    const entry = idempotencyStore.get("fresh-key");
    expect(entry).toBeDefined();
    expect(entry!.body).toBe('{"ok":true}');
  });
});

// =============================================================================
// M1: Body hash comparison
// =============================================================================

describe("idempotency body hash (M1)", () => {
  it("returns cached response when same key + same body", async () => {
    const { app } = createTestApp();

    const body = {
      id: "hash-same",
      kind: "transfer",
      description: "Body hash test",
      params: {},
    };

    const res1 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body, {
        "Idempotency-Key": "hash-key-1",
      }),
    );
    expect(res1.status).toBe(201);

    const res2 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body, {
        "Idempotency-Key": "hash-key-1",
      }),
    );
    expect(res2.status).toBe(201);
    expect(res2.headers.get("X-Idempotent-Replay")).toBe("true");
  });

  it("returns 422 when same key + different body", async () => {
    const { app } = createTestApp();

    const body1 = {
      id: "hash-diff-1",
      kind: "transfer",
      description: "First body",
      params: {},
    };
    const body2 = {
      id: "hash-diff-2",
      kind: "swap",
      description: "Different body",
      params: {},
    };

    const res1 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body1, {
        "Idempotency-Key": "hash-key-2",
      }),
    );
    expect(res1.status).toBe(201);

    const res2 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body2, {
        "Idempotency-Key": "hash-key-2",
      }),
    );
    expect(res2.status).toBe(422);
    const errBody = (await res2.json()) as { error: { code: string } };
    expect(errBody.error.code).toBe("IDEMPOTENCY_MISMATCH");
  });
});
