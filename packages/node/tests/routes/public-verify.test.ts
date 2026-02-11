/**
 * Public Verification Routes Tests
 *
 * Verifies:
 * - Health endpoint returns status
 * - State bundle endpoint returns data
 * - CORS headers present
 * - No auth required
 * - Rate limiting enforced
 * - Custom getBundleFn integration
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../src/app.js";
import type { AppInstance } from "../../src/app.js";

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(
  path: string,
  method: string = "GET",
  headers?: Record<string, string>,
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function createTestAppWithPublicVerify(
  publicVerify?: { rateLimitConfig?: { rpm: number; burst: number }; getBundleFn?: () => unknown },
): AppInstance {
  return createApp({
    serviceConfig: {
      ownerId: "test-tenant",
      defaultCurrency: "USDC",
      defaultDecimals: 6,
    },
    publicVerify,
  });
}

// =============================================================================
// Tests
// =============================================================================

describe("GET /public/v1/verify/health", () => {
  let instance: AppInstance;

  beforeEach(() => {
    instance = createTestAppWithPublicVerify();
  });

  it("returns 200 with status ok", async () => {
    const res = await instance.app.request(makeRequest("/public/v1/verify/health"));

    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: { status: string; timestamp: string } };
    expect(body.data.status).toBe("ok");
    expect(body.data.timestamp).toBeTruthy();
  });

  it("includes CORS headers", async () => {
    const res = await instance.app.request(
      makeRequest("/public/v1/verify/health", "GET", {
        Origin: "https://external-verifier.example.com",
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("responds to OPTIONS preflight", async () => {
    const res = await instance.app.request(
      makeRequest("/public/v1/verify/health", "OPTIONS", {
        Origin: "https://external-verifier.example.com",
        "Access-Control-Request-Method": "GET",
      }),
    );

    // CORS preflight should succeed (2xx)
    expect(res.status).toBeLessThan(300);
  });

  it("does not require auth headers", async () => {
    // No X-Api-Key, no Authorization header
    const res = await instance.app.request(makeRequest("/public/v1/verify/health"));

    expect(res.status).toBe(200);
  });
});

describe("GET /public/v1/verify/state-bundle", () => {
  it("returns default placeholder when no getBundleFn configured", async () => {
    const instance = createTestAppWithPublicVerify();
    const res = await instance.app.request(makeRequest("/public/v1/verify/state-bundle"));

    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: { version: number; message: string } };
    expect(body.data.version).toBe(1);
    expect(body.data.message).toBeTruthy();
  });

  it("returns custom bundle when getBundleFn is provided", async () => {
    const mockBundle = {
      version: 1,
      bundleHash: "a".repeat(64),
      globalStateHash: { hash: "b".repeat(64) },
      exportedAt: "2025-06-15T00:00:00Z",
    };

    const instance = createTestAppWithPublicVerify({
      getBundleFn: () => mockBundle,
    });

    const res = await instance.app.request(makeRequest("/public/v1/verify/state-bundle"));

    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: typeof mockBundle };
    expect(body.data.bundleHash).toBe("a".repeat(64));
    expect(body.data.exportedAt).toBe("2025-06-15T00:00:00Z");
  });

  it("includes rate limit header", async () => {
    const instance = createTestAppWithPublicVerify({
      rateLimitConfig: { rpm: 10, burst: 5 },
    });

    const res = await instance.app.request(makeRequest("/public/v1/verify/state-bundle"));

    expect(res.status).toBe(200);
    expect(res.headers.get("x-ratelimit-remaining")).toBeTruthy();
  });
});

describe("public rate limiting", () => {
  it("enforces rate limit after burst exhaustion", async () => {
    const instance = createTestAppWithPublicVerify({
      rateLimitConfig: { rpm: 10, burst: 3 },
    });

    // Exhaust the burst
    for (let i = 0; i < 3; i++) {
      const res = await instance.app.request(makeRequest("/public/v1/verify/health"));
      expect(res.status).toBe(200);
    }

    // Next request should be rate limited
    const res = await instance.app.request(makeRequest("/public/v1/verify/health"));
    expect(res.status).toBe(429);

    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("returns X-RateLimit-Remaining header", async () => {
    const instance = createTestAppWithPublicVerify({
      rateLimitConfig: { rpm: 10, burst: 5 },
    });

    const res = await instance.app.request(makeRequest("/public/v1/verify/health"));

    expect(res.status).toBe(200);
    const remaining = res.headers.get("x-ratelimit-remaining");
    expect(remaining).toBeTruthy();
    expect(Number(remaining)).toBeLessThanOrEqual(4);
  });
});

describe("public routes do not interfere with API routes", () => {
  it("API routes still work alongside public routes", async () => {
    const instance = createTestAppWithPublicVerify();

    // Public route works
    const publicRes = await instance.app.request(makeRequest("/public/v1/verify/health"));
    expect(publicRes.status).toBe(200);

    // Health route still works
    const healthRes = await instance.app.request(makeRequest("/health"));
    expect(healthRes.status).toBe(200);
  });
});
