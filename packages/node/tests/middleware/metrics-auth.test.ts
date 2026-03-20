/**
 * Tests for metrics endpoint authentication (H8).
 *
 * Verifies:
 * - /metrics returns 401 when metricsAuth is configured and no credentials provided
 * - /metrics works without auth when metricsAuth is not configured
 */

import { describe, it, expect } from "vitest";
import { createApp } from "../../src/app.js";
import { signJwt } from "../../src/middleware/auth.js";

const JWT_SECRET = "test-metrics-secret";

const baseServiceConfig = {
  ownerId: "test-owner",
  chainConfig: {},
};

describe("metrics endpoint auth", () => {
  it("returns 401 when metricsAuth is configured and no auth provided", async () => {
    const { app } = createApp({
      serviceConfig: baseServiceConfig,
      enableMetrics: true,
      metricsAuth: {
        apiKeys: new Map(),
        jwtSecret: JWT_SECRET,
      },
    });

    const res = await app.request("/metrics");
    expect(res.status).toBe(401);
  });

  it("returns 200 when metricsAuth is configured and valid auth provided", async () => {
    const { app } = createApp({
      serviceConfig: baseServiceConfig,
      enableMetrics: true,
      metricsAuth: {
        apiKeys: new Map([["metrics-key", { key: "metrics-key", role: "viewer" as const, tenantId: "t1" }]]),
      },
    });

    const res = await app.request("/metrics", {
      headers: { "X-Api-Key": "metrics-key" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("works without auth when metricsAuth is not configured", async () => {
    const { app } = createApp({
      serviceConfig: baseServiceConfig,
      enableMetrics: true,
      // No metricsAuth — backward compatible
    });

    const res = await app.request("/metrics");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });
});
