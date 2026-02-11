/**
 * Tests for canonical signing and signature aggregation.
 */

import { describe, it, expect } from "vitest";
import {
  buildCanonicalSigningPayload,
  orderSignatures,
  aggregateSignatures,
} from "../../src/governance/signing.js";
import { GovernanceStore } from "../../src/governance/governance-store.js";
import type { AttestationPayload } from "../../src/types.js";
import type { SignerSignature } from "../../src/governance/signing.js";

function makePayload(hash = "abc123"): AttestationPayload {
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

function makeStore() {
  const store = new GovernanceStore();
  store.addSigner("rSigner1", "One");
  store.addSigner("rSigner2", "Two");
  store.addSigner("rSigner3", "Three");
  store.changeQuorum(2);
  return store;
}

describe("buildCanonicalSigningPayload", () => {
  it("produces deterministic hash for same inputs", () => {
    const store = makeStore();
    const policy = store.getCurrentPolicy();
    const payload = makePayload();

    const hash1 = buildCanonicalSigningPayload(payload, policy);
    const hash2 = buildCanonicalSigningPayload(payload, policy);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex
  });

  it("produces different hash for different attestation", () => {
    const store = makeStore();
    const policy = store.getCurrentPolicy();

    const hash1 = buildCanonicalSigningPayload(makePayload("aaa"), policy);
    const hash2 = buildCanonicalSigningPayload(makePayload("bbb"), policy);

    expect(hash1).not.toBe(hash2);
  });

  it("produces different hash for different policy", () => {
    const store1 = makeStore();
    const store2 = new GovernanceStore();
    store2.addSigner("rOther", "Other");

    const payload = makePayload();
    const hash1 = buildCanonicalSigningPayload(payload, store1.getCurrentPolicy());
    const hash2 = buildCanonicalSigningPayload(payload, store2.getCurrentPolicy());

    expect(hash1).not.toBe(hash2);
  });
});

describe("orderSignatures", () => {
  it("orders signatures by address lexicographically", () => {
    const sigs: SignerSignature[] = [
      { address: "rC", signature: "sigC", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rA", signature: "sigA", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rB", signature: "sigB", signedAt: "2025-01-01T00:00:00Z" },
    ];

    const ordered = orderSignatures(sigs);

    expect(ordered[0]!.address).toBe("rA");
    expect(ordered[1]!.address).toBe("rB");
    expect(ordered[2]!.address).toBe("rC");
  });

  it("is stable for already-sorted input", () => {
    const sigs: SignerSignature[] = [
      { address: "rA", signature: "sigA", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rB", signature: "sigB", signedAt: "2025-01-01T00:00:00Z" },
    ];

    const ordered = orderSignatures(sigs);
    expect(ordered[0]!.address).toBe("rA");
    expect(ordered[1]!.address).toBe("rB");
  });

  it("does not mutate input array", () => {
    const sigs: SignerSignature[] = [
      { address: "rB", signature: "sigB", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rA", signature: "sigA", signedAt: "2025-01-01T00:00:00Z" },
    ];

    orderSignatures(sigs);
    expect(sigs[0]!.address).toBe("rB"); // Original unchanged
  });
});

describe("aggregateSignatures", () => {
  it("aggregates valid signatures meeting quorum", () => {
    const store = makeStore();
    const policy = store.getCurrentPolicy();
    const payload = makePayload();
    const payloadHash = buildCanonicalSigningPayload(payload, policy);

    const sigs: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rSigner2", signature: "sig2", signedAt: "2025-01-01T00:00:01Z" },
    ];

    const result = aggregateSignatures(sigs, policy, payloadHash);

    expect(result.quorum.met).toBe(true);
    expect(result.quorum.totalWeight).toBe(2);
    expect(result.payloadHash).toBe(payloadHash);
    expect(result.signatures.length).toBe(2);
    // Signatures should be ordered
    expect(result.signatures[0]!.address).toBe("rSigner1");
    expect(result.signatures[1]!.address).toBe("rSigner2");
  });

  it("throws when quorum not met", () => {
    const store = makeStore();
    const policy = store.getCurrentPolicy();

    const sigs: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
    ];

    expect(() => aggregateSignatures(sigs, policy, "hash123")).toThrow(
      "Quorum not met",
    );
  });

  it("throws on duplicate signatures", () => {
    const store = makeStore();
    const policy = store.getCurrentPolicy();

    const sigs: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rSigner1", signature: "sig1-dup", signedAt: "2025-01-01T00:00:01Z" },
    ];

    expect(() => aggregateSignatures(sigs, policy, "hash123")).toThrow(
      "Duplicate signatures",
    );
  });

  it("throws for non-policy signer", () => {
    const store = makeStore();
    const policy = store.getCurrentPolicy();

    const sigs: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rNonMember", signature: "sig2", signedAt: "2025-01-01T00:00:01Z" },
    ];

    expect(() => aggregateSignatures(sigs, policy, "hash123")).toThrow(
      "not in the governance policy",
    );
  });

  it("reports missing signers in quorum result", () => {
    const store = makeStore();
    const policy = store.getCurrentPolicy();
    const payload = makePayload();
    const payloadHash = buildCanonicalSigningPayload(payload, policy);

    const sigs: SignerSignature[] = [
      { address: "rSigner1", signature: "sig1", signedAt: "2025-01-01T00:00:00Z" },
      { address: "rSigner2", signature: "sig2", signedAt: "2025-01-01T00:00:01Z" },
    ];

    const result = aggregateSignatures(sigs, policy, payloadHash);
    expect(result.quorum.missingAddresses).toContain("rSigner3");
  });

  it("respects weighted signers", () => {
    const store = new GovernanceStore();
    store.addSigner("rAdmin", "Admin", 3);
    store.addSigner("rSigner1", "One", 1);
    store.changeQuorum(3);

    const policy = store.getCurrentPolicy();

    // Admin alone should meet quorum (weight 3 >= 3)
    const sigs: SignerSignature[] = [
      { address: "rAdmin", signature: "sig-admin", signedAt: "2025-01-01T00:00:00Z" },
    ];

    const result = aggregateSignatures(sigs, policy, "hash");
    expect(result.quorum.met).toBe(true);
    expect(result.quorum.totalWeight).toBe(3);
  });
});
