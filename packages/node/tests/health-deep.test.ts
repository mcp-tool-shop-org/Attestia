/**
 * Tests for deep health check (/ready endpoint).
 */

import { describe, it, expect } from "vitest";
import { createTestApp, jsonRequest } from "./setup.js";

describe("deep health check", () => {
  it("GET /health returns 200 always", async () => {
    const { app } = createTestApp();
    const res = await app.request(jsonRequest("/health"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("GET /ready returns 200 with no tenants initialized", async () => {
    const { app } = createTestApp();
    const res = await app.request(jsonRequest("/ready"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ready");
    expect(body.tenants).toBe(0);
  });

  it("GET /ready returns 200 after tenant is used", async () => {
    const { app } = createTestApp();

    // Trigger tenant creation by making an API request
    await app.request(jsonRequest("/api/v1/intents"));

    const res = await app.request(jsonRequest("/ready"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ready");
    expect(body.tenants).toBeGreaterThan(0);

    // Subsystem should report "ok"
    const subsystemKeys = Object.keys(body.subsystems);
    expect(subsystemKeys.length).toBeGreaterThan(0);
    for (const key of subsystemKeys) {
      expect(body.subsystems[key].status).toBe("ok");
    }
  });

  it("GET /ready returns 503 when service is stopped", async () => {
    const { app, tenantRegistry } = createTestApp();

    // Create a tenant, then stop it
    const service = tenantRegistry.getOrCreate("test-tenant");
    await service.stop();

    const res = await app.request(jsonRequest("/ready"));
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.status).toBe("not_ready");
  });

  it("GET /ready includes subsystem detail when down", async () => {
    const { app, tenantRegistry } = createTestApp();

    const service = tenantRegistry.getOrCreate("test-tenant");
    await service.stop();

    const res = await app.request(jsonRequest("/ready"));
    const body = await res.json();

    expect(body.subsystems["test-tenant"]).toBeDefined();
    expect(body.subsystems["test-tenant"].status).toBe("down");
  });

  it("GET /ready reports timestamp", async () => {
    const { app } = createTestApp();
    const res = await app.request(jsonRequest("/ready"));
    const body = await res.json();

    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
