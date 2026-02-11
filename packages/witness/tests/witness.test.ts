/**
 * XrplWitness integration tests
 *
 * Tests the top-level coordinator without a live XRPL connection.
 * Focuses on payload building, dry-run, and payload integrity.
 */
import { describe, it, expect, vi } from "vitest";
import { XrplWitness } from "../src/witness.js";
import { buildReconciliationPayload, buildRegistrumPayload, verifyPayloadHash } from "../src/payload.js";
import { fromHex, MEMO_TYPE } from "../src/memo-encoder.js";
import type { WitnessConfig } from "../src/types.js";
import type { ReconciliationReport, AttestationRecord } from "@attestia/reconciler";

const testConfig: WitnessConfig = {
  rpcUrl: "wss://s.altnet.rippletest.net:51233",
  chainId: "xrpl:testnet",
  account: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  secret: "sEdTM1uX8pu2do5XvTnutH6HsouMaM2",
};

function makeCleanReport(): ReconciliationReport {
  return {
    id: "recon-int-1",
    scope: { from: "2024-01-01T00:00:00Z", to: "2024-01-31T23:59:59Z" },
    timestamp: "2024-02-01T00:00:00Z",
    intentLedgerMatches: [],
    ledgerChainMatches: [],
    intentChainMatches: [],
    summary: {
      totalIntents: 10,
      totalLedgerEntries: 20,
      totalChainEvents: 8,
      matchedCount: 10,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
  };
}

function makeUncleanReport(): ReconciliationReport {
  return {
    id: "recon-int-2",
    scope: {},
    timestamp: "2024-02-01T00:00:00Z",
    intentLedgerMatches: [],
    ledgerChainMatches: [],
    intentChainMatches: [],
    summary: {
      totalIntents: 10,
      totalLedgerEntries: 20,
      totalChainEvents: 8,
      matchedCount: 7,
      mismatchCount: 2,
      missingCount: 1,
      allReconciled: false,
      discrepancies: ["Amount mismatch on intent-3", "Missing chain event for intent-7"],
    },
  };
}

function makeAttestation(reportId: string, clean: boolean): AttestationRecord {
  return {
    id: `att:${reportId}`,
    reconciliationId: reportId,
    allReconciled: clean,
    summary: clean
      ? {
          totalIntents: 10,
          totalLedgerEntries: 20,
          totalChainEvents: 8,
          matchedCount: 10,
          mismatchCount: 0,
          missingCount: 0,
          allReconciled: true,
          discrepancies: [],
        }
      : {
          totalIntents: 10,
          totalLedgerEntries: 20,
          totalChainEvents: 8,
          matchedCount: 7,
          mismatchCount: 2,
          missingCount: 1,
          allReconciled: false,
          discrepancies: ["Amount mismatch on intent-3", "Missing chain event for intent-7"],
        },
    attestedBy: "integration-test",
    attestedAt: "2024-02-01T00:00:01Z",
    reportHash: clean ? "cleanhash256" : "uncleanhash256",
  };
}

describe("XrplWitness", () => {
  describe("dryRun", () => {
    it("builds payload and transaction for clean reconciliation", () => {
      const witness = new XrplWitness(testConfig);
      const report = makeCleanReport();
      const attestation = makeAttestation("recon-int-1", true);
      const result = witness.dryRun(report, attestation);

      expect(result.payload.hash).toBeTruthy();
      expect(result.payload.source.kind).toBe("reconciliation");
      expect(result.payload.summary.clean).toBe(true);
      expect(result.payload.summary.matchedCount).toBe(10);
      expect(result.payload.summary.attestedBy).toBe("integration-test");

      expect(result.transaction.account).toBe(testConfig.account);
      expect(result.transaction.destination).toBe(testConfig.account);
      expect(result.transaction.amount).toBe("1");
    });

    it("builds payload for unclean reconciliation", () => {
      const witness = new XrplWitness(testConfig);
      const report = makeUncleanReport();
      const attestation = makeAttestation("recon-int-2", false);
      const result = witness.dryRun(report, attestation);

      expect(result.payload.summary.clean).toBe(false);
      expect(result.payload.summary.mismatchCount).toBe(2);
      expect(result.payload.summary.missingCount).toBe(1);
    });

    it("transaction memo has correct type", () => {
      const witness = new XrplWitness(testConfig);
      const report = makeCleanReport();
      const attestation = makeAttestation("recon-int-1", true);
      const result = witness.dryRun(report, attestation);

      expect(fromHex(result.transaction.memo.MemoType)).toBe(MEMO_TYPE);
    });

    it("payload hash is deterministic for same inputs", () => {
      // Freeze time to ensure deterministic timestamps in payload builder
      const now = new Date("2025-01-01T00:00:00.000Z");
      vi.useFakeTimers({ now });

      try {
        const witness = new XrplWitness(testConfig);
        const report = makeCleanReport();
        const attestation = makeAttestation("recon-int-1", true);

        const r1 = witness.dryRun(report, attestation);
        const r2 = witness.dryRun(report, attestation);

        expect(r1.payload.hash).toBe(r2.payload.hash);
      } finally {
        vi.useRealTimers();
      }
    });

    it("different reports produce different hashes", () => {
      const witness = new XrplWitness(testConfig);
      const r1 = witness.dryRun(makeCleanReport(), makeAttestation("recon-int-1", true));
      const r2 = witness.dryRun(makeUncleanReport(), makeAttestation("recon-int-2", false));

      expect(r1.payload.hash).not.toBe(r2.payload.hash);
    });
  });

  describe("verifyPayloadIntegrity", () => {
    it("returns true for valid reconciliation payload", () => {
      const witness = new XrplWitness(testConfig);
      const payload = buildReconciliationPayload(
        makeCleanReport(),
        makeAttestation("recon-int-1", true),
      );
      expect(witness.verifyPayloadIntegrity(payload)).toBe(true);
    });

    it("returns true for valid registrum payload", () => {
      const witness = new XrplWitness(testConfig);
      const payload = buildRegistrumPayload("state-42", 7, "registrar-v1");
      expect(witness.verifyPayloadIntegrity(payload)).toBe(true);
    });

    it("returns false for tampered payload", () => {
      const witness = new XrplWitness(testConfig);
      const payload = buildReconciliationPayload(
        makeCleanReport(),
        makeAttestation("recon-int-1", true),
      );
      const tampered = {
        ...payload,
        hash: "0".repeat(64),
      };
      expect(witness.verifyPayloadIntegrity(tampered)).toBe(false);
    });
  });

  describe("getRecords", () => {
    it("starts with an empty record list", () => {
      const witness = new XrplWitness(testConfig);
      expect(witness.getRecords()).toEqual([]);
    });
  });

  describe("connection", () => {
    it("witnessReconciliation throws when not connected", async () => {
      const witness = new XrplWitness(testConfig);
      const report = makeCleanReport();
      const attestation = makeAttestation("recon-int-1", true);

      await expect(witness.witnessReconciliation(report, attestation)).rejects.toThrow(
        /not connected/i,
      );
    });

    it("witnessRegistrumState throws when not connected", async () => {
      const witness = new XrplWitness(testConfig);
      await expect(witness.witnessRegistrumState("s1", 0, "att")).rejects.toThrow(
        /not connected/i,
      );
    });

    it("verify throws when not connected", async () => {
      const witness = new XrplWitness(testConfig);
      const payload = buildReconciliationPayload(
        makeCleanReport(),
        makeAttestation("recon-int-1", true),
      );
      const record = {
        id: "witness:test",
        payload,
        chainId: "xrpl:testnet" as const,
        txHash: "AABB",
        ledgerIndex: 1,
        witnessedAt: new Date().toISOString(),
        witnessAccount: testConfig.account,
      };

      await expect(witness.verify(record)).rejects.toThrow(/not connected/i);
    });
  });
});
