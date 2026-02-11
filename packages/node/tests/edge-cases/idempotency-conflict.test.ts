/**
 * Tests for idempotency edge cases.
 *
 * Verifies behavior when:
 * - Same key + same body → cached response returned
 * - Same key + different body → cached response returned (documents behavior)
 * - Missing key → request processed normally
 */

import { describe, it, expect } from "vitest";
import { createTestApp, jsonRequest } from "../setup.js";

describe("idempotency edge cases", () => {
  it("same key + same body → returns cached response", async () => {
    const { app } = createTestApp();
    const key = "idem-same-1";

    const body = {
      id: "idem-intent-1",
      kind: "transfer",
      description: "Idempotency test",
      params: {},
    };

    const res1 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body, {
        "Idempotency-Key": key,
      }),
    );
    expect(res1.status).toBe(201);

    const body1 = await res1.json();

    // Same key, same body
    const res2 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body, {
        "Idempotency-Key": key,
      }),
    );
    // Should return cached response
    expect(res2.status).toBe(201);

    const body2 = await res2.json();
    expect(body2).toEqual(body1);
  });

  it("same key + different body → returns cached response (not new)", async () => {
    const { app } = createTestApp();
    const key = "idem-diff-1";

    const body1 = {
      id: "idem-intent-2a",
      kind: "transfer",
      description: "First request",
      params: {},
    };

    const res1 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body1, {
        "Idempotency-Key": key,
      }),
    );
    expect(res1.status).toBe(201);

    const responseBody1 = await res1.json();

    // Same key, different body
    const body2 = {
      id: "idem-intent-2b",
      kind: "swap",
      description: "Different request",
      params: {},
    };

    const res2 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body2, {
        "Idempotency-Key": key,
      }),
    );
    // Should return the cached response from the first request
    expect(res2.status).toBe(201);

    const responseBody2 = await res2.json();
    expect(responseBody2).toEqual(responseBody1);
  });

  it("no idempotency key → request processed normally", async () => {
    const { app } = createTestApp();

    const res = await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "no-key-1",
        kind: "transfer",
        description: "No idempotency key",
        params: {},
      }),
    );
    expect(res.status).toBe(201);
  });

  it("GET requests ignore idempotency key", async () => {
    const { app } = createTestApp();

    const res1 = await app.request(
      jsonRequest("/api/v1/intents", "GET", undefined, {
        "Idempotency-Key": "get-key-1",
      }),
    );
    expect(res1.status).toBe(200);

    // Second GET with same key should still process normally
    const res2 = await app.request(
      jsonRequest("/api/v1/intents", "GET", undefined, {
        "Idempotency-Key": "get-key-1",
      }),
    );
    expect(res2.status).toBe(200);
  });
});
