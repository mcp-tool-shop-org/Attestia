/**
 * Payload builder tests
 *
 * Tests content-addressed attestation payload creation and verification.
 */
import { describe, it, expect } from "vitest";
import {
  buildReconciliationPayload,
  buildRegistrumPayload,
  verifyPayloadHash,
} from "../src/payload.js";
import type { ReconciliationReport, AttestationRecord } from "@attestia/reconciler";

function makeReport(overrides: Partial<ReconciliationReport> = {}): ReconciliationReport {
  return {
    id: "recon-test-1",
    scope: {},
    timestamp: "2024-01-01T00:00:00Z",
    intentLedgerMatches: [],
    ledgerChainMatches: [],
    intentChainMatches: [],
    summary: {
      totalIntents: 5,
      totalLedgerEntries: 10,
      totalChainEvents: 3,
      matchedCount: 5,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
    ...overrides,
  };
}

function makeAttestation(overrides: Partial<AttestationRecord> = {}): AttestationRecord {
  return {
    id: "att:recon-test-1",
    reconciliationId: "recon-test-1",
    allReconciled: true,
    summary: {
      totalIntents: 5,
      totalLedgerEntries: 10,
      totalChainEvents: 3,
      matchedCount: 5,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
    attestedBy: "test-attestor",
    attestedAt: "2024-01-01T00:00:01Z",
    reportHash: "abcdef1234567890",
    ...overrides,
  };
}

describe("buildReconciliationPayload", () => {
  it("creates a content-addressed payload from report + attestation", () => {
    const report = makeReport();
    const attestation = makeAttestation();
    const payload = buildReconciliationPayload(report, attestation);

    expect(payload.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.timestamp).toBeTruthy();
    expect(payload.source.kind).toBe("reconciliation");
    if (payload.source.kind === "reconciliation") {
      expect(payload.source.reportId).toBe("recon-test-1");
      expect(payload.source.reportHash).toBe("abcdef1234567890");
    }
    expect(payload.summary.clean).toBe(true);
    expect(payload.summary.matchedCount).toBe(5);
    expect(payload.summary.attestedBy).toBe("test-attestor");
  });

  it("marks unreconciled payloads as not clean", () => {
    const report = makeReport({
      summary: {
        totalIntents: 3,
        totalLedgerEntries: 4,
        totalChainEvents: 2,
        matchedCount: 1,
        mismatchCount: 1,
        missingCount: 1,
        allReconciled: false,
        discrepancies: ["Issue found"],
      },
    });
    const attestation = makeAttestation({ allReconciled: false });
    const payload = buildReconciliationPayload(report, attestation);

    expect(payload.summary.clean).toBe(false);
    expect(payload.summary.mismatchCount).toBe(1);
    expect(payload.summary.missingCount).toBe(1);
  });

  it("produces different hashes for different reports", () => {
    const report1 = makeReport({ id: "recon-1" });
    const report2 = makeReport({ id: "recon-2" });
    const att1 = makeAttestation({ reportHash: "hash1" });
    const att2 = makeAttestation({ reportHash: "hash2" });

    const payload1 = buildReconciliationPayload(report1, att1);
    const payload2 = buildReconciliationPayload(report2, att2);

    expect(payload1.hash).not.toBe(payload2.hash);
  });
});

describe("buildRegistrumPayload", () => {
  it("creates payload from registrum state info", () => {
    const payload = buildRegistrumPayload("state-1", 42, "registrum-witness");

    expect(payload.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.source.kind).toBe("registrum");
    if (payload.source.kind === "registrum") {
      expect(payload.source.stateId).toBe("state-1");
      expect(payload.source.orderIndex).toBe(42);
    }
    expect(payload.summary.attestedBy).toBe("registrum-witness");
    expect(payload.summary.clean).toBe(true);
  });

  it("accepts custom summary overrides", () => {
    const payload = buildRegistrumPayload("state-2", 1, "w", {
      clean: false,
      mismatchCount: 3,
    });

    expect(payload.summary.clean).toBe(false);
    expect(payload.summary.mismatchCount).toBe(3);
  });
});

describe("verifyPayloadHash", () => {
  it("verifies a valid reconciliation payload", () => {
    const report = makeReport();
    const attestation = makeAttestation();
    const payload = buildReconciliationPayload(report, attestation);

    expect(verifyPayloadHash(payload)).toBe(true);
  });

  it("verifies a valid registrum payload", () => {
    const payload = buildRegistrumPayload("state-1", 1, "w");
    expect(verifyPayloadHash(payload)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const payload = buildReconciliationPayload(makeReport(), makeAttestation());

    // Tamper with the payload
    const tampered = {
      ...payload,
      summary: { ...payload.summary, matchedCount: 999 },
    };

    expect(verifyPayloadHash(tampered)).toBe(false);
  });

  it("rejects a payload with wrong hash", () => {
    const payload = buildRegistrumPayload("state-1", 1, "w");
    const bad = { ...payload, hash: "0000000000000000000000000000000000000000000000000000000000000000" };
    expect(verifyPayloadHash(bad)).toBe(false);
  });
});
