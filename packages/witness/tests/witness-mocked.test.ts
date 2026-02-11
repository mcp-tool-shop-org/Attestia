/**
 * Tests for XrplWitness delegation methods with mocked internals.
 *
 * Covers: connect/disconnect, witnessReconciliation, witnessRegistrumState,
 * witnessPayload, verify, fetchPayload — all with mocked submitter/verifier.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { XrplWitness } from "../src/witness.js";
import {
  buildReconciliationPayload,
  buildRegistrumPayload,
} from "../src/payload.js";
import type { WitnessConfig, WitnessRecord, AttestationPayload } from "../src/types.js";
import type { ReconciliationReport, AttestationRecord } from "@attestia/reconciler";

// =============================================================================
// Helpers
// =============================================================================

const testConfig: WitnessConfig = {
  rpcUrl: "wss://dummy",
  chainId: "xrpl:testnet",
  account: "rTestAccount",
  secret: "sEdTM1uX8pu2do5XvTnutH6HsouMaM2",
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

function makeMockRecord(payload: AttestationPayload): WitnessRecord {
  return {
    id: `witness:${payload.hash.slice(0, 16)}`,
    payload,
    chainId: "xrpl:testnet",
    txHash: "MOCK_TXHASH",
    ledgerIndex: 100,
    witnessedAt: new Date().toISOString(),
    witnessAccount: "rTestAccount",
  };
}

function injectMocks(witness: XrplWitness) {
  const mockSubmitter = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    submit: vi.fn(),
    buildTransaction: vi.fn(),
  };
  const mockVerifier = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    verify: vi.fn(),
    fetchPayload: vi.fn(),
  };

  (witness as unknown as { submitter: unknown }).submitter = mockSubmitter;
  (witness as unknown as { verifier: unknown }).verifier = mockVerifier;

  return { mockSubmitter, mockVerifier };
}

// =============================================================================
// Tests
// =============================================================================

describe("XrplWitness (mocked)", () => {
  let witness: XrplWitness;
  let mockSubmitter: ReturnType<typeof injectMocks>["mockSubmitter"];
  let mockVerifier: ReturnType<typeof injectMocks>["mockVerifier"];

  beforeEach(() => {
    witness = new XrplWitness(testConfig);
    const mocks = injectMocks(witness);
    mockSubmitter = mocks.mockSubmitter;
    mockVerifier = mocks.mockVerifier;
  });

  describe("connect/disconnect", () => {
    it("connect() delegates to both submitter and verifier", async () => {
      await witness.connect();

      expect(mockSubmitter.connect).toHaveBeenCalledOnce();
      expect(mockVerifier.connect).toHaveBeenCalledOnce();
    });

    it("disconnect() delegates to both submitter and verifier", async () => {
      await witness.disconnect();

      expect(mockSubmitter.disconnect).toHaveBeenCalledOnce();
      expect(mockVerifier.disconnect).toHaveBeenCalledOnce();
    });
  });

  describe("witnessReconciliation()", () => {
    it("submits payload and returns record", async () => {
      const report = makeReport();
      const attestation = makeAttestation();
      const payload = buildReconciliationPayload(report, attestation);
      const record = makeMockRecord(payload);

      mockSubmitter.submit.mockResolvedValue(record);

      const result = await witness.witnessReconciliation(report, attestation);

      expect(result).toBe(record);
      expect(mockSubmitter.submit).toHaveBeenCalledOnce();
    });

    it("accumulates records", async () => {
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const record = makeMockRecord(payload);
      mockSubmitter.submit.mockResolvedValue(record);

      await witness.witnessReconciliation(makeReport(), makeAttestation());

      expect(witness.getRecords()).toHaveLength(1);
      expect(witness.getRecords()[0]).toBe(record);
    });
  });

  describe("witnessRegistrumState()", () => {
    it("submits registrum payload and returns record", async () => {
      const payload = buildRegistrumPayload("state-1", 5, "attestor");
      const record = makeMockRecord(payload);
      mockSubmitter.submit.mockResolvedValue(record);

      const result = await witness.witnessRegistrumState("state-1", 5, "attestor");

      expect(result).toBe(record);
      expect(mockSubmitter.submit).toHaveBeenCalledOnce();
    });
  });

  describe("witnessPayload()", () => {
    it("submits arbitrary payload and returns record", async () => {
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const record = makeMockRecord(payload);
      mockSubmitter.submit.mockResolvedValue(record);

      const result = await witness.witnessPayload(payload);

      expect(result).toBe(record);
      expect(witness.getRecords()).toHaveLength(1);
    });
  });

  describe("verify()", () => {
    it("delegates to verifier", async () => {
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      const record = makeMockRecord(payload);
      const verificationResult = {
        verified: true,
        witnessRecord: record,
        onChainHash: payload.hash,
        discrepancies: [],
      };

      mockVerifier.verify.mockResolvedValue(verificationResult);

      const result = await witness.verify(record);

      expect(result).toBe(verificationResult);
      expect(mockVerifier.verify).toHaveBeenCalledWith(record);
    });
  });

  describe("fetchPayload()", () => {
    it("delegates to verifier", async () => {
      const payload = buildReconciliationPayload(makeReport(), makeAttestation());
      mockVerifier.fetchPayload.mockResolvedValue(payload);

      const result = await witness.fetchPayload("TXHASH_123");

      expect(result).toBe(payload);
      expect(mockVerifier.fetchPayload).toHaveBeenCalledWith("TXHASH_123");
    });

    it("returns null when verifier returns null", async () => {
      mockVerifier.fetchPayload.mockResolvedValue(null);

      const result = await witness.fetchPayload("NO_SUCH_TX");

      expect(result).toBeNull();
    });
  });

  describe("record accumulation", () => {
    it("accumulates records across multiple witness calls", async () => {
      const payload1 = buildReconciliationPayload(makeReport(), makeAttestation());
      const payload2 = buildRegistrumPayload("s1", 1, "att");

      mockSubmitter.submit
        .mockResolvedValueOnce(makeMockRecord(payload1))
        .mockResolvedValueOnce(makeMockRecord(payload2));

      await witness.witnessReconciliation(makeReport(), makeAttestation());
      await witness.witnessRegistrumState("s1", 1, "att");

      expect(witness.getRecords()).toHaveLength(2);
    });
  });
});
