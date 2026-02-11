/**
 * Tests for tenant middleware.
 *
 * Verifies:
 * - Auth-derived tenant ID creates/reuses service instances
 * - Different tenants get isolated services
 */

import { describe, it, expect } from "vitest";
import { createTestApp, jsonRequest } from "../setup.js";

describe("tenant middleware (unsecured mode)", () => {
  it("uses X-Tenant-Id header for tenant isolation", async () => {
    const { app, tenantRegistry } = createTestApp();

    // Declare intent for tenant-a
    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "t-a-1",
        kind: "transfer",
        description: "Tenant A intent",
        params: {},
      }, { "X-Tenant-Id": "tenant-a" }),
    );

    // Declare intent for tenant-b
    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "t-b-1",
        kind: "swap",
        description: "Tenant B intent",
        params: {},
      }, { "X-Tenant-Id": "tenant-b" }),
    );

    // Verify tenant-a sees only its intent
    const resA = await app.request(
      new Request("http://localhost/api/v1/intents", {
        headers: { "X-Tenant-Id": "tenant-a" },
      }),
    );
    const bodyA = (await resA.json()) as { data: { id: string }[] };
    expect(bodyA.data.length).toBe(1);
    expect(bodyA.data[0]!.id).toBe("t-a-1");

    // Verify tenant-b sees only its intent
    const resB = await app.request(
      new Request("http://localhost/api/v1/intents", {
        headers: { "X-Tenant-Id": "tenant-b" },
      }),
    );
    const bodyB = (await resB.json()) as { data: { id: string }[] };
    expect(bodyB.data.length).toBe(1);
    expect(bodyB.data[0]!.id).toBe("t-b-1");

    // Verify two tenants are registered
    expect(tenantRegistry.tenantIds().length).toBe(2);
  });

  it("uses default tenant when X-Tenant-Id is not set", async () => {
    const { app } = createTestApp();

    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "default-1",
        kind: "transfer",
        description: "Default tenant",
        params: {},
      }),
    );

    const res = await app.request("/api/v1/intents");
    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data.length).toBe(1);
    expect(body.data[0]!.id).toBe("default-1");
  });
});
