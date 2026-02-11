/**
 * Submitter tests
 *
 * Tests the XrplSubmitter without a live XRPL connection.
 * Uses buildTransaction for dry-run testing.
 */
import { describe, it, expect } from "vitest";
import { XrplSubmitter } from "../src/submitter.js";
import { fromHex, MEMO_TYPE, MEMO_FORMAT } from "../src/memo-encoder.js";
import { buildReconciliationPayload } from "../src/payload.js";
import type { WitnessConfig } from "../src/types.js";
import type { ReconciliationReport, AttestationRecord } from "@attestia/reconciler";

const testConfig: WitnessConfig = {
  rpcUrl: "wss://s.altnet.rippletest.net:51233",
  chainId: "xrpl:testnet",
  account: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  secret: "sEdTM1uX8pu2do5XvTnutH6HsouMaM2", // Testnet genesis
};

function makeReport(): ReconciliationReport {
  return {
    id: "recon-1",
    scope: {},
    timestamp: "2024-01-01T00:00:00Z",
    intentLedgerMatches: [],
    ledgerChainMatches: [],
    intentChainMatches: [],
    summary: {
      totalIntents: 3,
      totalLedgerEntries: 6,
      totalChainEvents: 2,
      matchedCount: 3,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
  };
}

function makeAttestation(): AttestationRecord {
  return {
    id: "att:recon-1",
    reconciliationId: "recon-1",
    allReconciled: true,
    summary: {
      totalIntents: 3,
      totalLedgerEntries: 6,
      totalChainEvents: 2,
      matchedCount: 3,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
    attestedBy: "test-attestor",
    attestedAt: "2024-01-01T00:00:01Z",
    reportHash: "abc123",
  };
}

describe("XrplSubmitter", () => {
  describe("buildTransaction (dry-run)", () => {
    it("builds a self-send payment with attestation memo", () => {
      const submitter = new XrplSubmitter(testConfig);
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const tx = submitter.buildTransaction(payload);

      expect(tx.account).toBe(testConfig.account);
      expect(tx.destination).toBe(testConfig.account); // Self-send
      expect(tx.amount).toBe("1"); // 1 drop
      expect(fromHex(tx.memo.MemoType)).toBe(MEMO_TYPE);
      expect(tx.memo.MemoFormat).toBeDefined();
      expect(fromHex(tx.memo.MemoFormat!)).toBe(MEMO_FORMAT);
    });

    it("includes payload hash in memo data", () => {
      const submitter = new XrplSubmitter(testConfig);
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const tx = submitter.buildTransaction(payload);

      const memoData = JSON.parse(fromHex(tx.memo.MemoData));
      expect(memoData.hash).toBe(payload.hash);
      expect(memoData.source.kind).toBe("reconciliation");
    });

    it("amount is always 1 drop", () => {
      const submitter = new XrplSubmitter(testConfig);
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const tx = submitter.buildTransaction(payload);
      expect(tx.amount).toBe("1");
    });

    it("produces deterministic memo for same payload", () => {
      const submitter = new XrplSubmitter(testConfig);
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const tx1 = submitter.buildTransaction(payload);
      const tx2 = submitter.buildTransaction(payload);
      expect(tx1.memo.MemoData).toBe(tx2.memo.MemoData);
    });
  });

  describe("connection state", () => {
    it("is not connected before connect()", () => {
      const submitter = new XrplSubmitter(testConfig);
      expect(submitter.isConnected()).toBe(false);
    });

    it("throws on submit when not connected", async () => {
      const submitter = new XrplSubmitter(testConfig);
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());

      await expect(submitter.submit(payload)).rejects.toThrow(/not connected/i);
    });
  });
});
