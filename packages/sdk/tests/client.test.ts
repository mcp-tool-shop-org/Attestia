/**
 * Attestia Client Tests
 *
 * Verifies:
 * - Intent lifecycle (declare, get, list, approve, reject, execute, verify)
 * - Verification methods (stateHash, replay)
 * - Proof methods (merkleRoot, getAttestation, verifyProof)
 * - Error handling
 * - Pagination
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttestiaClient } from "../src/client.js";
import { AttestiaError } from "../src/types.js";

import type { Intent, AttestationProofPackage } from "../src/client.js";

// =============================================================================
// Mock Fetch Helper
// =============================================================================

interface MockRoute {
  method: string;
  pathPrefix: string;
  status: number;
  body: unknown;
}

function createRoutedMockFetch(routes: MockRoute[]): typeof fetch {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    const method = init?.method ?? "GET";

    const route = routes.find(
      (r) => r.method === method && urlStr.includes(r.pathPrefix),
    );

    if (route === undefined) {
      return new Response(
        JSON.stringify({ error: { code: "NOT_FOUND", message: `No route for ${method} ${urlStr}` } }),
        { status: 404 },
      );
    }

    return new Response(JSON.stringify(route.body), {
      status: route.status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

// =============================================================================
// Fixtures
// =============================================================================

const SAMPLE_INTENT: Intent = {
  id: "pay-001",
  status: "declared",
  kind: "transfer",
  description: "Payroll batch",
  declaredBy: "test-tenant",
  declaredAt: "2025-01-15T10:00:00.000Z",
  params: {
    toAddress: "0xabc",
    amount: { amount: "1000", currency: "USDC", decimals: 6 },
  },
};

const SAMPLE_PROOF_PACKAGE: AttestationProofPackage = {
  version: 1,
  attestation: { id: "att-1", data: "test" },
  attestationHash: "a".repeat(64),
  merkleRoot: "b".repeat(64),
  inclusionProof: {
    leafHash: "a".repeat(64),
    leafIndex: 0,
    siblings: [{ hash: "c".repeat(64), direction: "left" as const }],
    root: "b".repeat(64),
  },
  packagedAt: "2025-01-15T10:00:00.000Z",
  packageHash: "d".repeat(64),
};

// =============================================================================
// Intent Lifecycle
// =============================================================================

describe("AttestiaClient intents", () => {
  it("declares a new intent", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "POST",
        pathPrefix: "/api/v1/intents",
        status: 201,
        body: { data: SAMPLE_INTENT },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.intents.declare({
      id: "pay-001",
      kind: "transfer",
      description: "Payroll batch",
      params: { toAddress: "0xabc", amount: { amount: "1000", currency: "USDC", decimals: 6 } },
    });

    expect(result.data.id).toBe("pay-001");
    expect(result.data.status).toBe("declared");
    expect(result.status).toBe(201);

    // Verify request body
    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.kind).toBe("transfer");
    expect(body.params.toAddress).toBe("0xabc");
  });

  it("gets a single intent", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "GET",
        pathPrefix: "/api/v1/intents/pay-001",
        status: 200,
        body: { data: SAMPLE_INTENT },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.intents.get("pay-001");
    expect(result.data.id).toBe("pay-001");
    expect(result.data.kind).toBe("transfer");
  });

  it("lists intents with pagination", async () => {
    // List endpoint returns { data: T[], pagination: {...} } directly (no outer envelope)
    const mockFetch = createRoutedMockFetch([
      {
        method: "GET",
        pathPrefix: "/api/v1/intents",
        status: 200,
        body: {
          data: [SAMPLE_INTENT],
          pagination: { total: 1, hasMore: false, limit: 20 },
        },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.intents.list({ limit: 20 });
    expect(result.data.data).toHaveLength(1);
    expect(result.data.pagination.hasMore).toBe(false);

    // Verify query string
    const [url] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toContain("limit=20");
  });

  it("lists intents with cursor and status filter", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "GET",
        pathPrefix: "/api/v1/intents",
        status: 200,
        body: {
          data: [],
          pagination: { total: 0, hasMore: false, limit: 10 },
        },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    await client.intents.list({ cursor: "abc123", limit: 10, status: "approved" });

    const [url] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toContain("cursor=abc123");
    expect(url).toContain("limit=10");
    expect(url).toContain("status=approved");
  });

  it("approves an intent", async () => {
    const approvedIntent = { ...SAMPLE_INTENT, status: "approved" };
    const mockFetch = createRoutedMockFetch([
      {
        method: "POST",
        pathPrefix: "/api/v1/intents/pay-001/approve",
        status: 200,
        body: { data: approvedIntent },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.intents.approve("pay-001");
    expect(result.data.status).toBe("approved");
  });

  it("approves an intent with reason", async () => {
    const approvedIntent = { ...SAMPLE_INTENT, status: "approved" };
    const mockFetch = createRoutedMockFetch([
      {
        method: "POST",
        pathPrefix: "/api/v1/intents/pay-001/approve",
        status: 200,
        body: { data: approvedIntent },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    await client.intents.approve("pay-001", "Looks good");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.reason).toBe("Looks good");
  });

  it("rejects an intent with reason", async () => {
    const rejectedIntent = { ...SAMPLE_INTENT, status: "rejected" };
    const mockFetch = createRoutedMockFetch([
      {
        method: "POST",
        pathPrefix: "/api/v1/intents/pay-001/reject",
        status: 200,
        body: { data: rejectedIntent },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.intents.reject("pay-001", "Insufficient budget");
    expect(result.data.status).toBe("rejected");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.reason).toBe("Insufficient budget");
  });

  it("executes an intent", async () => {
    const executedIntent = { ...SAMPLE_INTENT, status: "executed" };
    const mockFetch = createRoutedMockFetch([
      {
        method: "POST",
        pathPrefix: "/api/v1/intents/pay-001/execute",
        status: 200,
        body: { data: executedIntent },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.intents.execute("pay-001", "eip155:1", "0xtxhash123");
    expect(result.data.status).toBe("executed");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.chainId).toBe("eip155:1");
    expect(body.txHash).toBe("0xtxhash123");
  });

  it("verifies an intent", async () => {
    const verifiedIntent = { ...SAMPLE_INTENT, status: "verified" };
    const mockFetch = createRoutedMockFetch([
      {
        method: "POST",
        pathPrefix: "/api/v1/intents/pay-001/verify",
        status: 200,
        body: { data: verifiedIntent },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.intents.verify("pay-001", true);
    expect(result.data.status).toBe("verified");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.matched).toBe(true);
    expect(body.discrepancies).toBeUndefined();
  });

  it("verifies an intent with discrepancies", async () => {
    const failedIntent = { ...SAMPLE_INTENT, status: "failed" };
    const mockFetch = createRoutedMockFetch([
      {
        method: "POST",
        pathPrefix: "/api/v1/intents/pay-001/verify",
        status: 200,
        body: { data: failedIntent },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.intents.verify("pay-001", false, ["Amount mismatch"]);
    expect(result.data.status).toBe("failed");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.matched).toBe(false);
    expect(body.discrepancies).toEqual(["Amount mismatch"]);
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe("AttestiaClient error handling", () => {
  it("throws AttestiaError on 404", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "GET",
        pathPrefix: "/api/v1/intents/nonexistent",
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "Intent not found" } },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    await expect(client.intents.get("nonexistent")).rejects.toThrow(AttestiaError);

    try {
      await client.intents.get("nonexistent");
    } catch (error) {
      // Second call falls through to the 404 default
    }
  });

  it("throws AttestiaError on validation error", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "POST",
        pathPrefix: "/api/v1/intents",
        status: 400,
        body: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: { field: "kind" },
          },
        },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    try {
      await client.intents.declare({
        id: "bad",
        kind: "transfer",
        description: "test",
        params: {},
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AttestiaError);
      const attError = error as AttestiaError;
      expect(attError.code).toBe("VALIDATION_ERROR");
      expect(attError.statusCode).toBe(400);
      expect(attError.details).toEqual({ field: "kind" });
    }
  });
});

// =============================================================================
// Verification Methods
// =============================================================================

describe("AttestiaClient verify", () => {
  it("gets state hash", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "GET",
        pathPrefix: "/api/v1/verify/hash",
        status: 200,
        body: {
          data: {
            hash: "a".repeat(64),
            computedAt: "2025-01-15T10:00:00.000Z",
          },
        },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.verify.stateHash();
    expect(result.data.hash).toBe("a".repeat(64));
    expect(result.data.computedAt).toBeTruthy();
  });

  it("performs replay verification", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "POST",
        pathPrefix: "/api/v1/verify/replay",
        status: 200,
        body: {
          data: {
            match: true,
            computedHash: "a".repeat(64),
            expectedHash: "a".repeat(64),
            details: {},
          },
        },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.verify.replay({
      ledgerSnapshot: { accounts: [] },
      registrumSnapshot: { intents: [] },
      expectedHash: "a".repeat(64),
    });

    expect(result.data.match).toBe(true);
    expect(result.data.computedHash).toBe("a".repeat(64));
  });
});

// =============================================================================
// Proof Methods
// =============================================================================

describe("AttestiaClient proofs", () => {
  it("gets merkle root", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "GET",
        pathPrefix: "/api/v1/proofs/merkle-root",
        status: 200,
        body: {
          data: {
            merkleRoot: "b".repeat(64),
            leafCount: 42,
            computedAt: "2025-01-15T10:00:00.000Z",
          },
        },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.proofs.merkleRoot();
    expect(result.data.merkleRoot).toBe("b".repeat(64));
    expect(result.data.leafCount).toBe(42);
  });

  it("gets attestation proof package", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "GET",
        pathPrefix: "/api/v1/proofs/attestation/att-1",
        status: 200,
        body: { data: SAMPLE_PROOF_PACKAGE },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.proofs.getAttestation("att-1");
    expect(result.data.version).toBe(1);
    expect(result.data.merkleRoot).toBe("b".repeat(64));
    expect(result.data.inclusionProof.siblings).toHaveLength(1);
  });

  it("verifies a proof package", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "POST",
        pathPrefix: "/api/v1/proofs/verify",
        status: 200,
        body: {
          data: {
            valid: true,
            verifiedAt: "2025-01-15T10:00:00.000Z",
          },
        },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.proofs.verifyProof(SAMPLE_PROOF_PACKAGE);
    expect(result.data.valid).toBe(true);
    expect(result.data.verifiedAt).toBeTruthy();
  });
});

// =============================================================================
// Full Intent Lifecycle
// =============================================================================

describe("AttestiaClient full lifecycle", () => {
  it("completes declare → approve → execute → verify", async () => {
    const states = ["declared", "approved", "executed", "verified"];
    let callCount = 0;

    const mockFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const intent = { ...SAMPLE_INTENT, status: states[callCount] ?? "verified" };
      callCount++;
      return new Response(
        JSON.stringify({ data: intent }),
        {
          status: callCount === 1 ? 201 : 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as unknown as typeof fetch;

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      fetchFn: mockFetch,
      retries: 0,
    });

    // 1. Declare
    const declared = await client.intents.declare({
      id: "pay-001",
      kind: "transfer",
      description: "Payroll",
      params: {},
    });
    expect(declared.data.status).toBe("declared");

    // 2. Approve
    const approved = await client.intents.approve("pay-001");
    expect(approved.data.status).toBe("approved");

    // 3. Execute
    const executed = await client.intents.execute("pay-001", "eip155:1", "0xhash");
    expect(executed.data.status).toBe("executed");

    // 4. Verify
    const verified = await client.intents.verify("pay-001", true);
    expect(verified.data.status).toBe("verified");

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });
});

// =============================================================================
// API Key Header
// =============================================================================

describe("AttestiaClient API key", () => {
  it("sends API key header on all requests", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "GET",
        pathPrefix: "/api/v1/intents/pay-001",
        status: 200,
        body: { data: SAMPLE_INTENT },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      apiKey: "secret-key-123",
      fetchFn: mockFetch,
      retries: 0,
    });

    await client.intents.get("pay-001");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(init.headers["X-Api-Key"]).toBe("secret-key-123");
  });

  it("does not send API key when not configured", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "GET",
        pathPrefix: "/api/v1/intents/pay-001",
        status: 200,
        body: { data: SAMPLE_INTENT },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    await client.intents.get("pay-001");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(init.headers["X-Api-Key"]).toBeUndefined();
  });
});

// =============================================================================
// URL Encoding
// =============================================================================

describe("AttestiaClient URL encoding", () => {
  it("encodes special characters in intent IDs", async () => {
    const mockFetch = createRoutedMockFetch([
      {
        method: "GET",
        pathPrefix: "/api/v1/intents/",
        status: 200,
        body: { data: { ...SAMPLE_INTENT, id: "pay/001" } },
      },
    ]);

    const client = new AttestiaClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    await client.intents.get("pay/001");

    const [url] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toContain("pay%2F001");
  });
});
