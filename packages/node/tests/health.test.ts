/**
 * Tests for health check endpoints.
 *
 * Verifies:
 * - GET /health returns 200 with status "ok"
 * - GET /ready returns 200 with status "ready" (no tenants)
 * - GET /ready reflects tenant readiness
 * - X-Request-Id is set on responses
 */

import { describe, it, expect } from "vitest";
import { createTestApp, jsonRequest } from "./setup.js";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const { app } = createTestApp();
    const res = await app.request("/health");

    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("includes X-Request-Id header", async () => {
    const { app } = createTestApp();
    const res = await app.request("/health");

    expect(res.headers.get("X-Request-Id")).toBeDefined();
  });

  it("preserves incoming X-Request-Id", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      jsonRequest("/health", "GET", undefined, {
        "X-Request-Id": "test-req-123",
      }),
    );

    expect(res.headers.get("X-Request-Id")).toBe("test-req-123");
  });
});

describe("GET /ready", () => {
  it("returns 200 ready when no tenants initialized", async () => {
    const { app } = createTestApp();
    const res = await app.request("/ready");

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      tenants: number;
    };
    expect(body.status).toBe("ready");
    expect(body.tenants).toBe(0);
  });

  it("returns 200 ready after tenant initialization", async () => {
    const { app, tenantRegistry } = createTestApp();

    // Create a tenant
    tenantRegistry.getOrCreate("tenant-1");

    const res = await app.request("/ready");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      tenants: number;
      subsystems: Record<string, { status: string }>;
    };
    expect(body.status).toBe("ready");
    expect(body.tenants).toBe(1);
    expect(body.subsystems["tenant-1"]!.status).toBe("ok");
  });

  it("returns 503 when a tenant is not ready", async () => {
    const { app, tenantRegistry } = createTestApp();

    // Create a tenant and stop it
    const service = tenantRegistry.getOrCreate("tenant-1");
    await service.stop();

    const res = await app.request("/ready");
    expect(res.status).toBe(503);

    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("not_ready");
  });
});

describe("error handling", () => {
  it("returns error envelope for unknown routes", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/nonexistent");

    expect(res.status).toBe(404);
  });
});
