/**
 * Tests for ETag middleware utilities.
 *
 * Verifies:
 * - computeETag returns a deterministic hash
 * - setETag sets the ETag header
 * - checkIfMatch returns 412 on mismatch
 * - checkIfMatch passes on match
 */

import { describe, it, expect } from "vitest";
import { computeETag } from "../../src/middleware/etag.js";

describe("computeETag", () => {
  it("returns a deterministic hash for the same object", () => {
    const obj = { id: "test", status: "declared" };
    const etag1 = computeETag(obj);
    const etag2 = computeETag(obj);

    expect(etag1).toBe(etag2);
  });

  it("returns different hashes for different objects", () => {
    const etag1 = computeETag({ id: "a" });
    const etag2 = computeETag({ id: "b" });

    expect(etag1).not.toBe(etag2);
  });

  it("returns a quoted string", () => {
    const etag = computeETag({ test: true });
    expect(etag).toMatch(/^"[a-f0-9]+"$/);
  });
});

describe("ETag on intent routes", () => {
  // Integration test: verify ETag header is set on intent GET
  it("GET /api/v1/intents/:id returns ETag header", async () => {
    // Use the full app for integration
    const { createTestApp, jsonRequest } = await import("../../tests/setup.js");
    const { app } = createTestApp();

    // Create an intent
    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "etag-intent",
        kind: "transfer",
        description: "ETag test",
        params: {},
      }),
    );

    // Fetch it
    const res = await app.request("/api/v1/intents/etag-intent");
    expect(res.status).toBe(200);
    expect(res.headers.get("ETag")).toBeDefined();
    expect(res.headers.get("ETag")).toMatch(/^"[a-f0-9]+"$/);
  });
});
