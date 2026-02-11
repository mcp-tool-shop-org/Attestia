/**
 * Tests for XrplVerifier with mocked XRPL client.
 *
 * Covers: verify() success paths, fetchPayload() success paths,
 * connect/disconnect, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { XrplVerifier } from "../src/verifier.js";
import { encodeMemo } from "../src/memo-encoder.js";
import {
  buildReconciliationPayload,
  buildRegistrumPayload,
} from "../src/payload.js";
import type { AttestationPayload, WitnessRecord, XrplMemo } from "../src/types.js";
import type { ReconciliationReport, AttestationRecord } from "@attestia/reconciler";

// =============================================================================
// Helpers
// =============================================================================

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
    attestedBy: "test-attestor",
    attestedAt: "2024-06-01T10:00:01Z",
    reportHash: "h256",
  };
}

function makePayload(): AttestationPayload {
  return buildReconciliationPayload(makeReport(), makeAttestation());
}

function makeRecord(payload: AttestationPayload): WitnessRecord {
  return {
    id: `witness:${payload.hash.slice(0, 16)}`,
    payload,
    chainId: "xrpl:testnet",
    txHash: "ABC123",
    ledgerIndex: 42,
    witnessedAt: new Date().toISOString(),
    witnessAccount: "rTestAccount",
  };
}

function buildMemoArray(memo: XrplMemo) {
  return [{ Memo: { MemoType: memo.MemoType, MemoData: memo.MemoData, MemoFormat: memo.MemoFormat } }];
}

// =============================================================================
// Mock XRPL client
// =============================================================================

function injectMockClient(
  verifier: XrplVerifier,
  requestFn: (...args: unknown[]) => unknown,
) {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    request: vi.fn().mockImplementation(requestFn),
  };
  // Inject the mock client via the private field
  (verifier as unknown as { client: unknown }).client = mockClient;
  return mockClient;
}

// =============================================================================
// Tests
// =============================================================================

describe("XrplVerifier (mocked)", () => {
  let verifier: XrplVerifier;

  beforeEach(() => {
    verifier = new XrplVerifier({
      rpcUrl: "wss://dummy",
      chainId: "xrpl:testnet",
    });
  });

  describe("verify() success paths", () => {
    it("returns verified=true when on-chain payload matches", async () => {
      const payload = makePayload();
      const record = makeRecord(payload);
      const memo = encodeMemo(payload);

      injectMockClient(verifier, () => ({
        result: { Memos: buildMemoArray(memo) },
      }));

      const result = await verifier.verify(record);

      expect(result.verified).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.onChainHash).toBe(payload.hash);
    });

    it("returns verified=false when transaction has no memos", async () => {
      const payload = makePayload();
      const record = makeRecord(payload);

      injectMockClient(verifier, () => ({
        result: { Memos: [] },
      }));

      const result = await verifier.verify(record);

      expect(result.verified).toBe(false);
      expect(result.discrepancies).toContain("Transaction has no memos");
    });

    it("returns verified=false when no Attestia memo found", async () => {
      const payload = makePayload();
      const record = makeRecord(payload);

      const otherMemo: XrplMemo = {
        MemoType: Buffer.from("other/type").toString("hex"),
        MemoData: Buffer.from("{}").toString("hex"),
      };
      injectMockClient(verifier, () => ({
        result: { Memos: [{ Memo: otherMemo }] },
      }));

      const result = await verifier.verify(record);

      expect(result.verified).toBe(false);
      expect(result.discrepancies[0]).toContain("No Attestia witness memo");
    });

    it("returns verified=false on hash mismatch", async () => {
      const payload = makePayload();
      const record = makeRecord({
        ...payload,
        hash: "0".repeat(64), // tampered expected hash
      });
      const memo = encodeMemo(payload);

      injectMockClient(verifier, () => ({
        result: { Memos: buildMemoArray(memo) },
      }));

      const result = await verifier.verify(record);

      expect(result.verified).toBe(false);
      expect(result.discrepancies[0]).toContain("Hash mismatch");
    });

    it("returns verified=false when on-chain payload hash is self-inconsistent", async () => {
      const payload = makePayload();
      const record = makeRecord(payload);

      // Create a memo with tampered content but original hash
      const tampered = { ...payload, timestamp: "tampered" };
      // Encode the tampered payload (its internal hash won't match its content)
      const memo = encodeMemo(tampered);

      injectMockClient(verifier, () => ({
        result: { Memos: buildMemoArray(memo) },
      }));

      const result = await verifier.verify(record);

      expect(result.verified).toBe(false);
      // Should have at least one discrepancy
      expect(result.discrepancies.length).toBeGreaterThan(0);
    });

    it("catches network errors and returns verified=false", async () => {
      const payload = makePayload();
      const record = makeRecord(payload);

      injectMockClient(verifier, () => {
        throw new Error("Network timeout");
      });

      const result = await verifier.verify(record);

      expect(result.verified).toBe(false);
      expect(result.discrepancies[0]).toContain("Failed to fetch transaction");
      expect(result.discrepancies[0]).toContain("Network timeout");
    });
  });

  describe("fetchPayload()", () => {
    it("returns decoded payload for valid attestia memo", async () => {
      const payload = makePayload();
      const memo = encodeMemo(payload);

      injectMockClient(verifier, () => ({
        result: { Memos: buildMemoArray(memo) },
      }));

      const result = await verifier.fetchPayload("TXHASH123");

      expect(result).not.toBeNull();
      expect(result!.hash).toBe(payload.hash);
      expect(result!.source.kind).toBe("reconciliation");
    });

    it("returns null when transaction has no memos", async () => {
      injectMockClient(verifier, () => ({
        result: {},
      }));

      const result = await verifier.fetchPayload("TXHASH123");
      expect(result).toBeNull();
    });

    it("returns null when no Attestia memo found", async () => {
      const otherMemo: XrplMemo = {
        MemoType: Buffer.from("other/type").toString("hex"),
        MemoData: Buffer.from("{}").toString("hex"),
      };
      injectMockClient(verifier, () => ({
        result: { Memos: [{ Memo: otherMemo }] },
      }));

      const result = await verifier.fetchPayload("TXHASH123");
      expect(result).toBeNull();
    });
  });

  describe("connect/disconnect", () => {
    it("disconnect is safe when not connected", async () => {
      // Should not throw
      await verifier.disconnect();
    });
  });
});
