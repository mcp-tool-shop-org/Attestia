/**
 * Tests for config.ts — parseApiKeys + loadConfig.
 */

import { describe, it, expect } from "vitest";
import { parseApiKeys, loadConfig } from "../src/config.js";

// =============================================================================
// parseApiKeys
// =============================================================================

describe("parseApiKeys", () => {
  it("returns empty array for empty string", () => {
    expect(parseApiKeys("")).toEqual([]);
    expect(parseApiKeys("   ")).toEqual([]);
  });

  it("parses a single key entry", () => {
    const keys = parseApiKeys("abc123:admin:tenant-1");
    expect(keys).toEqual([
      { key: "abc123", role: "admin", tenantId: "tenant-1" },
    ]);
  });

  it("parses multiple comma-separated entries", () => {
    const keys = parseApiKeys("k1:admin:t1,k2:operator:t2,k3:viewer:t3");
    expect(keys).toHaveLength(3);
    expect(keys[0]).toEqual({ key: "k1", role: "admin", tenantId: "t1" });
    expect(keys[1]).toEqual({ key: "k2", role: "operator", tenantId: "t2" });
    expect(keys[2]).toEqual({ key: "k3", role: "viewer", tenantId: "t3" });
  });

  it("trims whitespace around entries", () => {
    const keys = parseApiKeys("  k1:admin:t1 , k2:viewer:t2  ");
    expect(keys).toHaveLength(2);
    expect(keys[0]!.key).toBe("k1");
    expect(keys[1]!.key).toBe("k2");
  });

  it("throws on wrong number of parts", () => {
    expect(() => parseApiKeys("badentry")).toThrow("Invalid API_KEYS entry");
    expect(() => parseApiKeys("a:b")).toThrow("Invalid API_KEYS entry");
    expect(() => parseApiKeys("a:b:c:d")).toThrow("Invalid API_KEYS entry");
  });

  it("throws on empty key", () => {
    expect(() => parseApiKeys(":admin:t1")).toThrow("API key cannot be empty");
  });

  it("throws on invalid role", () => {
    expect(() => parseApiKeys("k1:superuser:t1")).toThrow("Invalid role");
  });

  it("throws on empty tenant ID", () => {
    expect(() => parseApiKeys("k1:admin:")).toThrow(
      "Tenant ID cannot be empty",
    );
  });
});

// =============================================================================
// loadConfig
// =============================================================================

describe("loadConfig", () => {
  it("returns defaults when env is empty", () => {
    const config = loadConfig({});
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe("0.0.0.0");
    expect(config.LOG_LEVEL).toBe("info");
    expect(config.NODE_ENV).toBe("development");
    expect(config.DEFAULT_CURRENCY).toBe("USDC");
    expect(config.DEFAULT_DECIMALS).toBe(6);
    expect(config.RATE_LIMIT_RPM).toBe(100);
  });

  it("parses overridden values", () => {
    const config = loadConfig({
      PORT: "8080",
      HOST: "127.0.0.1",
      LOG_LEVEL: "debug",
      NODE_ENV: "production",
    });
    expect(config.PORT).toBe(8080);
    expect(config.HOST).toBe("127.0.0.1");
    expect(config.LOG_LEVEL).toBe("debug");
    expect(config.NODE_ENV).toBe("production");
  });

  it("throws on invalid PORT", () => {
    expect(() => loadConfig({ PORT: "0" })).toThrow();
    expect(() => loadConfig({ PORT: "99999" })).toThrow();
  });
});
