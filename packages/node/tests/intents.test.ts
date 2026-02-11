/**
 * Tests for intent lifecycle routes.
 *
 * Covers: declare, list, get, approve, reject, execute, verify.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, jsonRequest } from "./setup.js";
import type { AppInstance } from "../src/app.js";

let instance: AppInstance;

beforeEach(() => {
  instance = createTestApp();
});

// =============================================================================
// POST /api/v1/intents — Declare
// =============================================================================

describe("POST /api/v1/intents", () => {
  it("declares a new intent and returns 201", async () => {
    const { app } = instance;
    const res = await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "intent-1",
        kind: "transfer",
        description: "Send 100 USDC",
        params: {
          fromAddress: "0xabc",
          toAddress: "0xdef",
        },
      }),
    );

    expect(res.status).toBe(201);

    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe("intent-1");
  });

  it("sets ETag header on the response", async () => {
    const { app } = instance;
    const res = await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "intent-etag",
        kind: "transfer",
        description: "ETag test",
        params: {},
      }),
    );

    expect(res.status).toBe(201);
    expect(res.headers.get("ETag")).toBeDefined();
  });

  it("returns 400 for invalid body", async () => {
    const { app } = instance;
    const res = await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        // missing required fields
        kind: "transfer",
      }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// =============================================================================
// GET /api/v1/intents — List
// =============================================================================

describe("GET /api/v1/intents", () => {
  it("returns empty list when no intents exist", async () => {
    const { app } = instance;
    const res = await app.request("/api/v1/intents");

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: unknown[];
      pagination: { hasMore: boolean };
    };
    expect(body.data).toEqual([]);
    expect(body.pagination.hasMore).toBe(false);
  });

  it("returns declared intents", async () => {
    const { app } = instance;

    // Declare an intent first
    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "list-1",
        kind: "swap",
        description: "Swap test",
        params: {},
      }),
    );

    const res = await app.request("/api/v1/intents");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data.length).toBe(1);
    expect(body.data[0]!.id).toBe("list-1");
  });

  it("supports pagination with limit", async () => {
    const { app } = instance;

    // Declare two intents
    for (const id of ["page-1", "page-2"]) {
      await app.request(
        jsonRequest("/api/v1/intents", "POST", {
          id,
          kind: "transfer",
          description: `Intent ${id}`,
          params: {},
        }),
      );
    }

    const res = await app.request("/api/v1/intents?limit=1");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: { id: string }[];
      pagination: { cursor: string | null; hasMore: boolean };
    };
    expect(body.data.length).toBe(1);
    expect(body.pagination.hasMore).toBe(true);
    expect(body.pagination.cursor).not.toBeNull();
  });
});

// =============================================================================
// GET /api/v1/intents/:id — Get one
// =============================================================================

describe("GET /api/v1/intents/:id", () => {
  it("returns an existing intent", async () => {
    const { app } = instance;

    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "get-1",
        kind: "transfer",
        description: "Get test",
        params: {},
      }),
    );

    const res = await app.request("/api/v1/intents/get-1");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe("get-1");
  });

  it("returns 404 for non-existent intent", async () => {
    const { app } = instance;
    const res = await app.request("/api/v1/intents/nonexistent");

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

// =============================================================================
// POST /api/v1/intents/:id/approve
// =============================================================================

describe("POST /api/v1/intents/:id/approve", () => {
  it("approves a declared intent", async () => {
    const { app } = instance;

    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "approve-1",
        kind: "transfer",
        description: "Approve test",
        params: {},
      }),
    );

    const res = await app.request(
      jsonRequest("/api/v1/intents/approve-1/approve", "POST", {
        reason: "Looks good",
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; status: string } };
    expect(body.data.id).toBe("approve-1");
  });
});

// =============================================================================
// POST /api/v1/intents/:id/reject
// =============================================================================

describe("POST /api/v1/intents/:id/reject", () => {
  it("rejects a declared intent", async () => {
    const { app } = instance;

    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "reject-1",
        kind: "transfer",
        description: "Reject test",
        params: {},
      }),
    );

    const res = await app.request(
      jsonRequest("/api/v1/intents/reject-1/reject", "POST", {
        reason: "Insufficient funds",
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe("reject-1");
  });
});

// =============================================================================
// POST /api/v1/intents/:id/execute
// =============================================================================

describe("POST /api/v1/intents/:id/execute", () => {
  it("executes an approved intent", async () => {
    const { app } = instance;

    // Declare and approve
    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "exec-1",
        kind: "transfer",
        description: "Execute test",
        params: {},
      }),
    );
    await app.request(
      jsonRequest("/api/v1/intents/exec-1/approve", "POST", {}),
    );

    const res = await app.request(
      jsonRequest("/api/v1/intents/exec-1/execute", "POST", {
        chainId: "evm:1",
        txHash: "0xabc123",
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe("exec-1");
  });
});

// =============================================================================
// POST /api/v1/intents/:id/verify
// =============================================================================

describe("POST /api/v1/intents/:id/verify", () => {
  it("verifies an executed intent", async () => {
    const { app } = instance;

    // Declare → approve → execute
    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "verify-1",
        kind: "transfer",
        description: "Verify test",
        params: {},
      }),
    );
    await app.request(
      jsonRequest("/api/v1/intents/verify-1/approve", "POST", {}),
    );
    await app.request(
      jsonRequest("/api/v1/intents/verify-1/execute", "POST", {
        chainId: "evm:1",
        txHash: "0xverify",
      }),
    );

    const res = await app.request(
      jsonRequest("/api/v1/intents/verify-1/verify", "POST", {
        matched: true,
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe("verify-1");
  });
});
