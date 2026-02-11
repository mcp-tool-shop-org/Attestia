/**
 * Tests for Registrum–Governance Bridge.
 *
 * Authority validation, historical quorum, and governance replay.
 */

import { describe, it, expect } from "vitest";
import {
  validateAuthority,
  replayGovernanceHistory,
  replayToVersion,
  validateHistoricalQuorum,
} from "../../src/governance/registrum-bridge.js";
import { GovernanceStore } from "../../src/governance/governance-store.js";
import type { GovernancePolicy, GovernanceChangeEvent } from "../../src/governance/types.js";
import type { SignerSignature } from "../../src/governance/signing.js";
import type { AttestationPayload } from "../../src/types.js";
import type { RegistrumStateRef } from "../../src/governance/registrum-bridge.js";

// =============================================================================
// Helpers
// =============================================================================

function makePayload(hash = "test-hash"): AttestationPayload {
  return {
    hash,
    timestamp: "2025-01-01T00:00:00Z",
    source: { kind: "registrum", stateId: "state1", orderIndex: 1 },
    summary: {
      clean: true,
      matchedCount: 10,
      mismatchCount: 0,
      missingCount: 0,
      attestedBy: "system",
    },
  };
}

function makeGovernanceStore(): GovernanceStore {
  const store = new GovernanceStore();
  store.addSigner("rSigner1", "One");
  store.addSigner("rSigner2", "Two");
  store.addSigner("rSigner3", "Three");
  store.changeQuorum(2);
  return store;
}

function makeStateRef(policy: GovernancePolicy): RegistrumStateRef {
  return {
    stateId: "state1",
    orderIndex: 1,
    policyId: policy.id,
    policyVersion: policy.version,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("validateAuthority", () => {
  it("validates matching policy and state ref", () => {
    const store = makeGovernanceStore();
    const policy = store.getCurrentPolicy();
    const stateRef = makeStateRef(policy);

    const result = validateAuthority(policy, stateRef);

    expect(result.valid).toBe(true);
    expect(result.rejections).toHaveLength(0);
    expect(result.policy).toBe(policy);
    expect(result.stateRef).toBe(stateRef);
  });

  it("rejects mismatched policy ID", () => {
    const store = makeGovernanceStore();
    const policy = store.getCurrentPolicy();
    const stateRef: RegistrumStateRef = {
      ...makeStateRef(policy),
      policyId: "wrong-policy-id",
    };

    const result = validateAuthority(policy, stateRef);

    expect(result.valid).toBe(false);
    expect(result.rejections.length).toBeGreaterThan(0);
    expect(result.rejections[0]).toContain("Policy ID mismatch");
  });

  it("rejects mismatched policy version", () => {
    const store = makeGovernanceStore();
    const policy = store.getCurrentPolicy();
    const stateRef: RegistrumStateRef = {
      ...makeStateRef(policy),
      policyVersion: 999,
    };

    const result = validateAuthority(policy, stateRef);

    expect(result.valid).toBe(false);
    expect(result.rejections.some((r) => r.includes("version mismatch"))).toBe(true);
  });

  it("rejects policy with no signers", () => {
    const emptyPolicy: GovernancePolicy = {
      id: "empty",
      version: 0,
      signers: [],
      quorum: 1,
      updatedAt: "2025-01-01T00:00:00Z",
    };
    const stateRef: RegistrumStateRef = {
      stateId: "state1",
      orderIndex: 1,
      policyId: "empty",
      policyVersion: 0,
    };

    const result = validateAuthority(emptyPolicy, stateRef);

    expect(result.valid).toBe(false);
    expect(result.rejections.some((r) => r.includes("no signers"))).toBe(true);
  });

  it("rejects unachievable quorum", () => {
    const badPolicy: GovernancePolicy = {
      id: "bad",
      version: 1,
      signers: [{ address: "rA", label: "A", weight: 1, addedAt: "2025-01-01T00:00:00Z" }],
      quorum: 5, // Quorum > total weight
      updatedAt: "2025-01-01T00:00:00Z",
    };
    const stateRef: RegistrumStateRef = {
      stateId: "state1",
      orderIndex: 1,
      policyId: "bad",
      policyVersion: 1,
    };

    const result = validateAuthority(badPolicy, stateRef);

    expect(result.valid).toBe(false);
    expect(result.rejections.some((r) => r.includes("exceeds total signer weight"))).toBe(true);
  });

  it("collects multiple rejections", () => {
    const badPolicy: GovernancePolicy = {
      id: "wrong-id",
      version: 0,
      signers: [],
      quorum: 1,
      updatedAt: "2025-01-01T00:00:00Z",
    };
    const stateRef: RegistrumStateRef = {
      stateId: "state1",
      orderIndex: 1,
      policyId: "expected-id",
      policyVersion: 5,
    };

    const result = validateAuthority(badPolicy, stateRef);

    expect(result.valid).toBe(false);
    // Should have at least 3 rejections: ID mismatch, version mismatch, no signers
    expect(result.rejections.length).toBeGreaterThanOrEqual(3);
  });
});

describe("replayGovernanceHistory", () => {
  it("replays events to rebuild policy", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();

    const replayedPolicy = replayGovernanceHistory(events);

    // Should produce the same policy
    expect(replayedPolicy.id).toBe(store.getCurrentPolicy().id);
    expect(replayedPolicy.version).toBe(store.getCurrentPolicy().version);
    expect(replayedPolicy.quorum).toBe(2);
    expect(replayedPolicy.signers.length).toBe(3);
  });

  it("empty events produce empty policy", () => {
    const policy = replayGovernanceHistory([]);

    expect(policy.version).toBe(0);
    expect(policy.signers.length).toBe(0);
    expect(policy.quorum).toBe(1); // Default
  });

  it("replay is deterministic — same events produce same policy", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();

    const p1 = replayGovernanceHistory(events);
    const p2 = replayGovernanceHistory(events);

    expect(p1.id).toBe(p2.id);
    expect(p1.version).toBe(p2.version);
    expect(p1.quorum).toBe(p2.quorum);
  });
});

describe("replayToVersion", () => {
  it("replays to specific version", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();

    // After 2 events (2 signers added), version = 2
    const policy = replayToVersion(events, 2);

    expect(policy.version).toBe(2);
    expect(policy.signers.length).toBe(2);
    expect(policy.quorum).toBe(1); // Quorum change is event #4
  });

  it("version 0 produces empty policy", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();

    const policy = replayToVersion(events, 0);

    expect(policy.version).toBe(0);
    expect(policy.signers.length).toBe(0);
  });

  it("full version produces same as current policy", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();

    const policy = replayToVersion(events, events.length);

    expect(policy.id).toBe(store.getCurrentPolicy().id);
    expect(policy.version).toBe(store.getCurrentPolicy().version);
  });

  it("throws for negative version", () => {
    expect(() => replayToVersion([], -1)).toThrow("Target version must be >= 0");
  });

  it("throws for version exceeding event count", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();

    expect(() => replayToVersion(events, events.length + 1)).toThrow(
      "exceeds event history length",
    );
  });
});

describe("validateHistoricalQuorum", () => {
  it("valid quorum at historical policy version", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();
    const payload = makePayload();

    // Policy at version 4 (all events: 3 signers + quorum change)
    const signatures: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rSigner2", signature: "sig2", signedAt: "2025-01-01T00:00:01Z" },
    ];

    const result = validateHistoricalQuorum(payload, signatures, events, 4);

    expect(result.valid).toBe(true);
    expect(result.quorum.met).toBe(true);
    expect(result.quorum.totalWeight).toBe(2);
    expect(result.rejections).toHaveLength(0);
  });

  it("rejects when quorum not met", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();
    const payload = makePayload();

    // Only 1 signer but quorum is 2
    const signatures: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
    ];

    const result = validateHistoricalQuorum(payload, signatures, events, 4);

    expect(result.valid).toBe(false);
    expect(result.quorum.met).toBe(false);
    expect(result.rejections.some((r) => r.includes("Quorum not met"))).toBe(true);
  });

  it("rejects signer not in historical policy", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();
    const payload = makePayload();

    const signatures: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rNonMember", signature: "sig2", signedAt: "2025-01-01T00:00:01Z" },
    ];

    const result = validateHistoricalQuorum(payload, signatures, events, 4);

    expect(result.valid).toBe(false);
    expect(result.rejections.some((r) => r.includes("not in policy"))).toBe(true);
  });

  it("rejects duplicate signatures", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();
    const payload = makePayload();

    const signatures: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rSigner1", signature: "sig1-dup", signedAt: "2025-01-01T00:00:01Z" },
    ];

    const result = validateHistoricalQuorum(payload, signatures, events, 4);

    expect(result.valid).toBe(false);
    expect(result.rejections.some((r) => r.includes("Duplicate"))).toBe(true);
  });

  it("handles invalid version gracefully", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();
    const payload = makePayload();

    const signatures: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
    ];

    const result = validateHistoricalQuorum(payload, signatures, events, 999);

    expect(result.valid).toBe(false);
    expect(result.rejections.some((r) => r.includes("Failed to replay"))).toBe(true);
  });

  it("validates at earlier version when signer was present", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();
    const payload = makePayload();

    // At version 2 (2 signers added, quorum still default 1)
    const signatures: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
    ];

    const result = validateHistoricalQuorum(payload, signatures, events, 2);

    expect(result.valid).toBe(true);
    expect(result.policyAtTime.version).toBe(2);
    expect(result.policyAtTime.quorum).toBe(1); // Default quorum before change
  });

  it("backward compat: validates pre-governance attestation (version 0)", () => {
    const store = makeGovernanceStore();
    const events = store.getEventHistory();
    const payload = makePayload();

    // Version 0 = no signers at all
    const signatures: SignerSignature[] = [];

    const result = validateHistoricalQuorum(payload, signatures, events, 0);

    // No signers, but quorum is 1, so weight 0 < 1 → not met
    expect(result.valid).toBe(false);
    expect(result.quorum.met).toBe(false);
  });
});
