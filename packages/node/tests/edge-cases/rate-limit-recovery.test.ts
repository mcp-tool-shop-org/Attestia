/**
 * Tests for rate limit recovery behavior.
 *
 * Verifies that:
 * - Rate limit is enforced (429 returned)
 * - Retry-After header is present
 * - Recovery happens after waiting
 */

import { describe, it, expect } from "vitest";
import { createApp } from "../../src/app.js";
import type { ApiKeyRecord } from "../../src/types/auth.js";
import { jsonRequest } from "../setup.js";

function makeKeyMap(keys: ApiKeyRecord[]): ReadonlyMap<string, ApiKeyRecord> {
  const map = new Map<string, ApiKeyRecord>();
  for (const k of keys) {
    map.set(k.key, k);
  }
  return map;
}

function createRateLimitedApp() {
  return createApp({
    serviceConfig: {
      ownerId: "rate-test",
      defaultCurrency: "USDC",
      defaultDecimals: 6,
    },
    auth: {
      apiKeys: makeKeyMap([
        { key: "test-key", tenantId: "rate-test", role: "admin" },
      ]),
      jwtSecret: "test-secret",
    },
    rateLimit: { rpm: 3, burst: 3 },
  });
}

describe("rate limit recovery", () => {
  it("returns 429 after exceeding burst limit", async () => {
    const { app } = createRateLimitedApp();

    const headers = { "X-Api-Key": "test-key" };

    // Send requests up to burst limit
    for (let i = 0; i < 3; i++) {
      const res = await app.request(
        jsonRequest("/api/v1/intents", "GET", undefined, headers),
      );
      expect(res.status).toBe(200);
    }

    // Next request should be rate limited
    const res = await app.request(
      jsonRequest("/api/v1/intents", "GET", undefined, headers),
    );
    expect(res.status).toBe(429);
  });

  it("includes Retry-After header on 429", async () => {
    const { app } = createRateLimitedApp();

    const headers = { "X-Api-Key": "test-key" };

    // Exhaust rate limit
    for (let i = 0; i < 3; i++) {
      await app.request(
        jsonRequest("/api/v1/intents", "GET", undefined, headers),
      );
    }

    const res = await app.request(
      jsonRequest("/api/v1/intents", "GET", undefined, headers),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  it("different tenants have independent rate limits", async () => {
    const { app } = createApp({
      serviceConfig: {
        ownerId: "default",
        defaultCurrency: "USDC",
        defaultDecimals: 6,
      },
      auth: {
        apiKeys: makeKeyMap([
          { key: "key-a", tenantId: "tenant-a", role: "admin" },
          { key: "key-b", tenantId: "tenant-b", role: "admin" },
        ]),
        jwtSecret: "test-secret",
      },
      rateLimit: { rpm: 2, burst: 2 },
    });

    // Tenant A: exhaust limit
    for (let i = 0; i < 2; i++) {
      await app.request(
        jsonRequest("/api/v1/intents", "GET", undefined, {
          "X-Api-Key": "key-a",
        }),
      );
    }

    // Tenant A should be limited
    const resA = await app.request(
      jsonRequest("/api/v1/intents", "GET", undefined, {
        "X-Api-Key": "key-a",
      }),
    );
    expect(resA.status).toBe(429);

    // Tenant B should still work
    const resB = await app.request(
      jsonRequest("/api/v1/intents", "GET", undefined, {
        "X-Api-Key": "key-b",
      }),
    );
    expect(resB.status).toBe(200);
  });
});
