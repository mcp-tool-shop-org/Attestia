/**
 * Tenant Governance Tests
 *
 * Verifies:
 * - Tenant governance creation
 * - SLA assignment
 * - Suspended tenant blocked
 * - Active tenant allowed
 * - Tenant suspension and reactivation
 * - Governance replay via event sourcing
 * - Fail-closed semantics
 */

import { describe, it, expect } from "vitest";
import {
  createTenantGovernancePolicy,
  suspendTenant,
  reactivateTenant,
  validateTenantGovernance,
  assignSlaPolicy,
} from "../../src/sla/tenant-governance.js";
import type { SlaPolicy } from "../../src/sla/types.js";

// =============================================================================
// Fixtures
// =============================================================================

const SAMPLE_SLA: SlaPolicy = {
  id: "sla-prod",
  name: "Production SLA",
  version: 1,
  targets: [
    { metric: "replay_time_ms", operator: "lte", threshold: 500, window: "24h" },
    { metric: "hash_chain_integrity_pct", operator: "gte", threshold: 99.9, window: "7d" },
  ],
  createdAt: "2025-01-15T00:00:00.000Z",
};

// =============================================================================
// Tenant Creation
// =============================================================================

describe("Tenant Governance: creation", () => {
  it("creates a new active tenant", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme Corp");
    expect(tenant.tenantId).toBe("tenant-1");
    expect(tenant.tenantName).toBe("Acme Corp");
    expect(tenant.status).toBe("active");
    expect(tenant.slaPolicy).toBeNull();
    expect(tenant.governancePolicyId).toBeNull();
    expect(tenant.createdAt).toBeTruthy();
  });

  it("creates tenant with SLA policy", () => {
    const tenant = createTenantGovernancePolicy("tenant-2", "Corp B", SAMPLE_SLA);
    expect(tenant.slaPolicy).toEqual(SAMPLE_SLA);
    expect(tenant.slaPolicy!.targets).toHaveLength(2);
  });

  it("creates tenant with governance policy reference", () => {
    const tenant = createTenantGovernancePolicy(
      "tenant-3",
      "Corp C",
      SAMPLE_SLA,
      "gov-policy-abc",
    );
    expect(tenant.governancePolicyId).toBe("gov-policy-abc");
  });

  it("throws on empty tenant ID", () => {
    expect(() => createTenantGovernancePolicy("", "Name")).toThrow("cannot be empty");
  });

  it("throws on empty tenant name", () => {
    expect(() => createTenantGovernancePolicy("id", "")).toThrow("cannot be empty");
  });
});

// =============================================================================
// SLA Assignment
// =============================================================================

describe("Tenant Governance: SLA assignment", () => {
  it("assigns SLA policy to tenant", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme");
    expect(tenant.slaPolicy).toBeNull();

    const updated = assignSlaPolicy(tenant, SAMPLE_SLA);
    expect(updated.slaPolicy).toEqual(SAMPLE_SLA);
    expect(updated.tenantId).toBe("tenant-1"); // Unchanged
    expect(updated.status).toBe("active"); // Unchanged
  });

  it("replaces existing SLA policy", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme", SAMPLE_SLA);
    const newSla: SlaPolicy = { ...SAMPLE_SLA, id: "sla-v2", version: 2 };

    const updated = assignSlaPolicy(tenant, newSla);
    expect(updated.slaPolicy!.id).toBe("sla-v2");
    expect(updated.slaPolicy!.version).toBe(2);
  });
});

// =============================================================================
// Validation: Active Tenants
// =============================================================================

describe("Tenant Governance: active tenant validation", () => {
  const allActions = [
    "declare_intent",
    "approve_intent",
    "execute_intent",
    "export_state",
    "generate_proof",
    "submit_verification",
  ] as const;

  it("active tenant is allowed for all actions", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme");

    for (const action of allActions) {
      const result = validateTenantGovernance(tenant, action);
      expect(result.allowed).toBe(true);
      expect(result.tenantId).toBe("tenant-1");
      expect(result.action).toBe(action);
      expect(result.reason).toContain("active");
    }
  });
});

// =============================================================================
// Validation: Suspended Tenants
// =============================================================================

describe("Tenant Governance: suspended tenant validation", () => {
  it("suspended tenant is blocked for all actions", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme");
    const suspended = suspendTenant(tenant, "SLA violation");

    const allActions = [
      "declare_intent",
      "approve_intent",
      "execute_intent",
      "export_state",
      "generate_proof",
      "submit_verification",
    ] as const;

    for (const action of allActions) {
      const result = validateTenantGovernance(suspended, action);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("suspended");
      expect(result.reason).toContain("SLA violation");
    }
  });
});

// =============================================================================
// Suspension & Reactivation
// =============================================================================

describe("Tenant Governance: suspension lifecycle", () => {
  it("suspends a tenant with reason", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme");
    const suspended = suspendTenant(tenant, "Audit findings");

    expect(suspended.status).toBe("suspended");
    expect(suspended.suspendedAt).toBeTruthy();
    expect(suspended.suspendedReason).toBe("Audit findings");
    expect(suspended.tenantId).toBe("tenant-1"); // Unchanged
  });

  it("throws when suspending already suspended tenant", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme");
    const suspended = suspendTenant(tenant, "Reason");

    expect(() => suspendTenant(suspended, "Again")).toThrow("already suspended");
  });

  it("throws on empty suspension reason", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme");
    expect(() => suspendTenant(tenant, "")).toThrow("cannot be empty");
  });

  it("reactivates a suspended tenant", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme");
    const suspended = suspendTenant(tenant, "Temporary");
    const reactivated = reactivateTenant(suspended);

    expect(reactivated.status).toBe("active");
    expect(reactivated.suspendedAt).toBeUndefined();
    expect(reactivated.suspendedReason).toBeUndefined();
  });

  it("throws when reactivating already active tenant", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme");
    expect(() => reactivateTenant(tenant)).toThrow("already active");
  });

  it("reactivated tenant is allowed to act", () => {
    const tenant = createTenantGovernancePolicy("tenant-1", "Acme");
    const suspended = suspendTenant(tenant, "Temporary");
    const reactivated = reactivateTenant(suspended);

    const result = validateTenantGovernance(reactivated, "declare_intent");
    expect(result.allowed).toBe(true);
  });
});

// =============================================================================
// GovernanceStore SLA Integration
// =============================================================================

describe("GovernanceStore SLA policy", () => {
  // These tests import GovernanceStore to verify event-sourcing integration
  let GovernanceStore: typeof import("@attestia/witness").GovernanceStore;

  it("sets and retrieves SLA policy via GovernanceStore", async () => {
    // Dynamic import to avoid circular deps at test time
    const mod = await import("@attestia/witness");
    GovernanceStore = mod.GovernanceStore;

    const store = new GovernanceStore();
    expect(store.getCurrentSlaPolicy()).toBeNull();

    const event = store.setSlaPolicy("sla-1", "Production SLA", 1, 3);
    expect(event.type).toBe("sla_policy_set");

    const policy = store.getCurrentSlaPolicy();
    expect(policy).not.toBeNull();
    expect(policy!.id).toBe("sla-1");
    expect(policy!.name).toBe("Production SLA");
    expect(policy!.version).toBe(1);
    expect(policy!.targetCount).toBe(3);
  });

  it("SLA policy survives replay", async () => {
    const mod = await import("@attestia/witness");
    const store = new mod.GovernanceStore();

    store.addSigner("rAddr1", "Signer 1");
    store.setSlaPolicy("sla-1", "Prod", 1, 5);

    const events = store.getEventHistory();

    // Replay into a new store
    const store2 = new mod.GovernanceStore();
    store2.replayFrom(events);

    const policy = store2.getCurrentSlaPolicy();
    expect(policy).not.toBeNull();
    expect(policy!.id).toBe("sla-1");
    expect(policy!.targetCount).toBe(5);
    expect(store2.signerCount).toBe(1);
  });

  it("rejects empty SLA policy ID", async () => {
    const mod = await import("@attestia/witness");
    const store = new mod.GovernanceStore();

    expect(() => store.setSlaPolicy("", "Name", 1, 0)).toThrow("cannot be empty");
  });

  it("rejects invalid SLA policy version", async () => {
    const mod = await import("@attestia/witness");
    const store = new mod.GovernanceStore();

    expect(() => store.setSlaPolicy("id", "Name", 0, 0)).toThrow("must be >= 1");
  });
});
