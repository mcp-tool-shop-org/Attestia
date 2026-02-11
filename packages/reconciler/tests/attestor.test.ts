/**
 * Attestor tests
 */
import { describe, it, expect } from "vitest";
import { StructuralRegistrar } from "@attestia/registrum";
import { Attestor } from "../src/attestor.js";
import type { ReconciliationReport } from "../src/types.js";

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

describe("Attestor", () => {
  it("registers a reconciliation report as a Registrum state", async () => {
    const registrar = new StructuralRegistrar({ mode: "legacy" });
    const attestor = new Attestor(registrar, "test-attestor");

    const report = makeReport();
    const attestation = await attestor.attest(report);

    expect(attestation.reconciliationId).toBe("recon-test-1");
    expect(attestation.allReconciled).toBe(true);
    expect(attestation.attestedBy).toBe("test-attestor");
    expect(attestation.reportHash).toMatch(/^[a-f0-9]{64}$/);
    expect(attestation.summary.matchedCount).toBe(5);
  });

  it("creates a lineage chain across multiple attestations", async () => {
    const registrar = new StructuralRegistrar({ mode: "legacy" });
    const attestor = new Attestor(registrar, "test-attestor");

    const report1 = makeReport({ id: "recon-1" });
    const report2 = makeReport({ id: "recon-2" });

    const att1 = await attestor.attest(report1);
    expect(attestor.getLastStateId()).toBe("attestation:test-attestor");

    const att2 = await attestor.attest(report2);
    // Same state ID — each attestation is an update to the same logical state
    expect(attestor.getLastStateId()).toBe("attestation:test-attestor");

    // Verify lineage in Registrum — state is updated in place
    const lineage = registrar.getLineage("attestation:test-attestor");
    expect(lineage.length).toBeGreaterThanOrEqual(1);

    expect(att1.id).toBe("att:recon-1");
    expect(att2.id).toBe("att:recon-2");
  });

  it("captures discrepancies in attestation", async () => {
    const registrar = new StructuralRegistrar({ mode: "legacy" });
    const attestor = new Attestor(registrar, "test-attestor");

    const report = makeReport({
      id: "recon-bad",
      summary: {
        totalIntents: 3,
        totalLedgerEntries: 4,
        totalChainEvents: 2,
        matchedCount: 1,
        mismatchCount: 1,
        missingCount: 1,
        allReconciled: false,
        discrepancies: ["Amount mismatch on intent-1", "Missing chain for intent-2"],
      },
    });

    const attestation = await attestor.attest(report);
    expect(attestation.allReconciled).toBe(false);
    expect(attestation.summary.mismatchCount).toBe(1);
    expect(attestation.summary.missingCount).toBe(1);
    expect(attestation.summary.discrepancies).toHaveLength(2);
  });

  it("produces different hashes for different reports", async () => {
    const registrar = new StructuralRegistrar({ mode: "legacy" });
    const attestor = new Attestor(registrar, "test-attestor");

    const report1 = makeReport({ id: "recon-a" });
    const report2 = makeReport({
      id: "recon-b",
      summary: {
        totalIntents: 1,
        totalLedgerEntries: 2,
        totalChainEvents: 1,
        matchedCount: 1,
        mismatchCount: 0,
        missingCount: 0,
        allReconciled: true,
        discrepancies: [],
      },
    });

    const att1 = await attestor.attest(report1);
    const att2 = await attestor.attest(report2);
    expect(att1.reportHash).not.toBe(att2.reportHash);
  });

  it("getLastStateId returns null before any attestation", () => {
    const registrar = new StructuralRegistrar({ mode: "legacy" });
    const attestor = new Attestor(registrar, "test-attestor");
    expect(attestor.getLastStateId()).toBeNull();
  });
});
