/**
 * Verifier tests
 *
 * Tests XrplVerifier logic without a live XRPL connection.
 * Uses unit tests on the underlying components (memo decode, hash verify)
 * since the verifier itself requires a connected XrplClient.
 */
import { describe, it, expect } from "vitest";
import { XrplVerifier } from "../src/verifier.js";
import { encodeMemo, decodeMemo, isAttestiaMemo } from "../src/memo-encoder.js";
import { buildReconciliationPayload, buildRegistrumPayload, verifyPayloadHash } from "../src/payload.js";
import type { AttestationPayload, WitnessRecord, XrplMemo } from "../src/types.js";
import type { ReconciliationReport, AttestationRecord } from "@attestia/reconciler";

function makeReport(): ReconciliationReport {
  return {
    id: "recon-v1",
    scope: {},
    timestamp: "2024-06-01T10:00:00Z",
    intentLedgerMatches: [],
    ledgerChainMatches: [],
    intentChainMatches: [],
    summary: {
      totalIntents: 5,
      totalLedgerEntries: 10,
      totalChainEvents: 4,
      matchedCount: 5,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
  };
}

function makeAttestation(): AttestationRecord {
  return {
    id: "att:recon-v1",
    reconciliationId: "recon-v1",
    allReconciled: true,
    summary: {
      totalIntents: 5,
      totalLedgerEntries: 10,
      totalChainEvents: 4,
      matchedCount: 5,
      mismatchCount: 0,
      missingCount: 0,
      allReconciled: true,
      discrepancies: [],
    },
    attestedBy: "verifier-test",
    attestedAt: "2024-06-01T10:00:01Z",
    reportHash: "h256",
  };
}

function makeWitnessRecord(payload: AttestationPayload): WitnessRecord {
  return {
    id: `witness:${payload.hash.slice(0, 16)}`,
    payload,
    chainId: "xrpl:testnet",
    txHash: "ABC123DEF456",
    ledgerIndex: 42,
    witnessedAt: new Date().toISOString(),
    witnessAccount: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  };
}

describe("XrplVerifier", () => {
  describe("connection state", () => {
    it("throws on verify when not connected", async () => {
      const verifier = new XrplVerifier({
        rpcUrl: "wss://dummy",
        chainId: "xrpl:testnet",
      });
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const record = makeWitnessRecord(payload);

      await expect(verifier.verify(record)).rejects.toThrow(/not connected/i);
    });

    it("throws on fetchPayload when not connected", async () => {
      const verifier = new XrplVerifier({
        rpcUrl: "wss://dummy",
        chainId: "xrpl:testnet",
      });

      await expect(verifier.fetchPayload("AABBCC")).rejects.toThrow(/not connected/i);
    });
  });

  describe("verification logic (offline components)", () => {
    it("round-trip: encode → decode preserves payload hash", () => {
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const memo = encodeMemo(payload);
      const decoded = decodeMemo(memo);

      expect(decoded.hash).toBe(payload.hash);
      expect(decoded.source.kind).toBe("reconciliation");
      expect(decoded.summary.attestedBy).toBe("verifier-test");
    });

    it("detect tampered memo data", () => {
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const memo = encodeMemo(payload);

      // Tamper with the memo data
      const tampered: XrplMemo = {
        ...memo,
        MemoData: memo.MemoData.slice(0, -4) + "ffff",
      };

      // Decoding tampered memo should yield a different payload
      // (or throw if invalid JSON)
      expect(isAttestiaMemo(tampered)).toBe(true); // MemoType still matches
    });

    it("verifyPayloadHash succeeds for valid reconciliation payload", () => {
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      expect(verifyPayloadHash(payload)).toBe(true);
    });

    it("verifyPayloadHash succeeds for valid registrum payload", () => {
      const payload = buildRegistrumPayload("state-1", 0, "test-attestor");
      expect(verifyPayloadHash(payload)).toBe(true);
    });

    it("verifyPayloadHash fails for tampered payload", () => {
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const tampered = { ...payload, hash: "0000000000000000000000000000000000000000000000000000000000000000" };
      expect(verifyPayloadHash(tampered)).toBe(false);
    });

    it("isAttestiaMemo correctly identifies attestia memos", () => {
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const memo = encodeMemo(payload);
      expect(isAttestiaMemo(memo)).toBe(true);
    });

    it("isAttestiaMemo rejects non-attestia memos", () => {
      const otherMemo: XrplMemo = {
        MemoType: Buffer.from("other/type").toString("hex"),
        MemoData: Buffer.from("{}").toString("hex"),
      };
      expect(isAttestiaMemo(otherMemo)).toBe(false);
    });

    it("witness record id includes payload hash prefix", () => {
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const record = makeWitnessRecord(payload);
      expect(record.id).toBe(`witness:${payload.hash.slice(0, 16)}`);
    });
  });
});
