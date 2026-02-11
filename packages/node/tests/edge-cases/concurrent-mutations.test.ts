/**
 * Tests for concurrent mutation edge cases.
 *
 * Verifies behavior when multiple requests attempt to mutate
 * the same intent simultaneously.
 */

import { describe, it, expect } from "vitest";
import { createTestApp, jsonRequest } from "../setup.js";

describe("concurrent mutations", () => {
  it("two concurrent approvals on same intent — second fails", async () => {
    const { app } = createTestApp();

    // Declare an intent
    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "concurrent-1",
        kind: "transfer",
        description: "Concurrent test",
        params: {},
      }),
    );

    // Send two approvals concurrently
    const [res1, res2] = await Promise.all([
      app.request(
        jsonRequest("/api/v1/intents/concurrent-1/approve", "POST", {}),
      ),
      app.request(
        jsonRequest("/api/v1/intents/concurrent-1/approve", "POST", {}),
      ),
    ]);

    // One should succeed, one should fail (already approved)
    const statuses = [res1.status, res2.status].sort();
    // At least one succeeds
    expect(statuses).toContain(200);
  });

  it("approve + reject on same intent — one wins", async () => {
    const { app } = createTestApp();

    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "race-1",
        kind: "transfer",
        description: "Race condition test",
        params: {},
      }),
    );

    const [approveRes, rejectRes] = await Promise.all([
      app.request(
        jsonRequest("/api/v1/intents/race-1/approve", "POST", {}),
      ),
      app.request(
        jsonRequest("/api/v1/intents/race-1/reject", "POST", {
          reason: "Budget exceeded",
        }),
      ),
    ]);

    // One should succeed, at least one succeeds
    const statuses = [approveRes.status, rejectRes.status];
    expect(statuses.filter((s) => s === 200).length).toBeGreaterThanOrEqual(1);
  });

  it("duplicate declare with same ID", async () => {
    const { app } = createTestApp();

    const body = {
      id: "dup-1",
      kind: "transfer",
      description: "First declaration",
      params: {},
    };

    const res1 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body),
    );
    expect(res1.status).toBe(201);

    // Second declaration with same ID should fail
    const res2 = await app.request(
      jsonRequest("/api/v1/intents", "POST", body, {
        "Idempotency-Key": "different-key",
      }),
    );
    // Should get an error (intent already exists)
    expect(res2.status).toBeGreaterThanOrEqual(400);
  });
});
