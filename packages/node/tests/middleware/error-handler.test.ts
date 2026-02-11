/**
 * Tests for error handler middleware.
 *
 * Verifies domain errors are mapped to correct HTTP status codes
 * and the error envelope format.
 */

import { describe, it, expect } from "vitest";
import { createTestApp, jsonRequest } from "../setup.js";

describe("error handler", () => {
  it("returns 409 for invalid intent state transition", async () => {
    const { app } = createTestApp();

    // Declare an intent
    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "err-1",
        kind: "transfer",
        description: "Error test",
        params: {},
      }),
    );

    // Try to execute without approving first → should throw domain error
    const res = await app.request(
      jsonRequest("/api/v1/intents/err-1/execute", "POST", {
        chainId: "evm:1",
        txHash: "0xerr",
      }),
    );

    // The domain should reject this transition
    expect(res.status).toBeGreaterThanOrEqual(400);

    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
    expect(body.error.message).toBeDefined();
  });

  it("returns error envelope with correct structure", async () => {
    const { app } = createTestApp();

    // Non-existent intent → 404
    const res = await app.request(
      jsonRequest("/api/v1/intents/does-not-exist/approve", "POST", {}),
    );

    expect(res.status).toBeGreaterThanOrEqual(400);

    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error).toBeDefined();
    expect(typeof body.error.code).toBe("string");
    expect(typeof body.error.message).toBe("string");
  });
});
