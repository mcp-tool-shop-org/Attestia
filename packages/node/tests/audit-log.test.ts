/**
 * Tests for the AuditLog service.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AuditLog } from "../src/services/audit-log.js";
import type { AuditLogEntry } from "../src/services/audit-log.js";

describe("AuditLog", () => {
  let log: AuditLog;

  beforeEach(() => {
    log = new AuditLog();
  });

  it("starts empty", () => {
    expect(log.size).toBe(0);
    expect(log.query()).toEqual([]);
  });

  it("appends entries with auto-generated timestamp", () => {
    log.append({
      tenantId: "t1",
      action: "declare",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
    });

    expect(log.size).toBe(1);
    const entries = log.query();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.tenantId).toBe("t1");
    expect(entries[0]!.action).toBe("declare");
    expect(entries[0]!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns entries newest-first", () => {
    log.append({
      tenantId: "t1",
      action: "declare",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
    });
    log.append({
      tenantId: "t1",
      action: "approve",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
    });

    const entries = log.query();
    expect(entries[0]!.action).toBe("approve");
    expect(entries[1]!.action).toBe("declare");
  });

  it("filters by tenantId", () => {
    log.append({
      tenantId: "t1",
      action: "declare",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
    });
    log.append({
      tenantId: "t2",
      action: "declare",
      resourceType: "intent",
      resourceId: "i-2",
      actor: "api",
    });

    const t1Entries = log.query({ tenantId: "t1" });
    expect(t1Entries).toHaveLength(1);
    expect(t1Entries[0]!.resourceId).toBe("i-1");
  });

  it("filters by action", () => {
    log.append({
      tenantId: "t1",
      action: "declare",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
    });
    log.append({
      tenantId: "t1",
      action: "approve",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
    });

    const approvals = log.query({ action: "approve" });
    expect(approvals).toHaveLength(1);
    expect(approvals[0]!.action).toBe("approve");
  });

  it("filters by resourceType", () => {
    log.append({
      tenantId: "t1",
      action: "declare",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
    });
    log.append({
      tenantId: "t1",
      action: "attest",
      resourceType: "attestation",
      resourceId: "a-1",
      actor: "api",
    });

    const attestations = log.query({ resourceType: "attestation" });
    expect(attestations).toHaveLength(1);
    expect(attestations[0]!.resourceId).toBe("a-1");
  });

  it("filters by resourceId", () => {
    log.append({
      tenantId: "t1",
      action: "declare",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
    });
    log.append({
      tenantId: "t1",
      action: "declare",
      resourceType: "intent",
      resourceId: "i-2",
      actor: "api",
    });

    const entries = log.query({ resourceId: "i-2" });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.resourceId).toBe("i-2");
  });

  it("combines multiple filters", () => {
    log.append({
      tenantId: "t1",
      action: "declare",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
    });
    log.append({
      tenantId: "t1",
      action: "approve",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
    });
    log.append({
      tenantId: "t2",
      action: "approve",
      resourceType: "intent",
      resourceId: "i-2",
      actor: "api",
    });

    const entries = log.query({ tenantId: "t1", action: "approve" });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.resourceId).toBe("i-1");
  });

  it("respects limit", () => {
    for (let i = 0; i < 10; i++) {
      log.append({
        tenantId: "t1",
        action: "declare",
        resourceType: "intent",
        resourceId: `i-${i}`,
        actor: "api",
      });
    }

    const entries = log.query({ limit: 3 });
    expect(entries).toHaveLength(3);
  });

  it("includes optional detail field", () => {
    log.append({
      tenantId: "t1",
      action: "reject",
      resourceType: "intent",
      resourceId: "i-1",
      actor: "api",
      detail: "Insufficient funds",
    });

    const entries = log.query();
    expect(entries[0]!.detail).toBe("Insufficient funds");
  });
});
