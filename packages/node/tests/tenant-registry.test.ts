/**
 * Tests for TenantRegistry — has() and stopAll().
 */

import { describe, it, expect } from "vitest";
import { TenantRegistry } from "../src/services/tenant-registry.js";

const defaultConfig = {
  ownerId: "default",
  defaultCurrency: "USDC",
  defaultDecimals: 6,
};

describe("TenantRegistry", () => {
  it("has() returns false for unknown tenant", () => {
    const registry = new TenantRegistry(defaultConfig);
    expect(registry.has("nonexistent")).toBe(false);
  });

  it("has() returns true after getOrCreate", () => {
    const registry = new TenantRegistry(defaultConfig);
    registry.getOrCreate("tenant-a");
    expect(registry.has("tenant-a")).toBe(true);
    expect(registry.has("tenant-b")).toBe(false);
  });

  it("stopAll() clears the registry", async () => {
    const registry = new TenantRegistry(defaultConfig);
    registry.getOrCreate("t1");
    registry.getOrCreate("t2");

    expect(registry.tenantIds().length).toBe(2);

    await registry.stopAll();

    expect(registry.tenantIds().length).toBe(0);
    expect(registry.has("t1")).toBe(false);
    expect(registry.has("t2")).toBe(false);
  });
});
