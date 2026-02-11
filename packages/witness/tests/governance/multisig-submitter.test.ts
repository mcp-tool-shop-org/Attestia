/**
 * Tests for MultiSigSubmitter — multi-signature XRPL transaction submission.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MultiSigSubmitter, normalizeTimestamp } from "../../src/governance/multisig-submitter.js";
import { GovernanceStore } from "../../src/governance/governance-store.js";
import type { MultiSigConfig } from "../../src/governance/multisig-submitter.js";
import type { AttestationPayload } from "../../src/types.js";

// =============================================================================
// Mocks
// =============================================================================

const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);
const mockIsConnected = vi.fn().mockReturnValue(true);
const mockAutofill = vi.fn();
const mockSubmitAndWait = vi.fn();

vi.mock("xrpl", () => {
  return {
    Client: vi.fn().mockImplementation(() => ({
      connect: mockConnect,
      disconnect: mockDisconnect,
      isConnected: mockIsConnected,
      autofill: mockAutofill,
      submitAndWait: mockSubmitAndWait,
    })),
    Wallet: {
      fromSeed: vi.fn().mockImplementation((seed: string) => ({
        address: `rAddr_${seed}`,
        sign: vi.fn().mockImplementation((tx: unknown, multisign?: boolean) => ({
          tx_blob: `blob_${seed}_${multisign ? "multi" : "single"}`,
          hash: `hash_${seed}`,
        })),
      })),
    },
    multisign: vi.fn().mockReturnValue("combined_multisign_blob"),
  };
});

// =============================================================================
// Helpers
// =============================================================================

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

function makeConfig(signerCount = 3): MultiSigConfig {
  const signers = [];
  for (let i = 1; i <= signerCount; i++) {
    signers.push({
      address: `rSigner${i}`,
      secret: `seed${i}`,
    });
  }
  return {
    rpcUrl: "wss://test.xrpl.example.com",
    chainId: "xrpl:testnet",
    account: "rMultiSigAccount",
    signers,
    timeoutMs: 5000,
  };
}

function makeGovernanceStore(signerCount = 3, quorum = 2): GovernanceStore {
  const store = new GovernanceStore();
  for (let i = 1; i <= signerCount; i++) {
    store.addSigner(`rSigner${i}`, `Signer ${i}`);
  }
  store.changeQuorum(quorum);
  return store;
}

// =============================================================================
// Tests
// =============================================================================

describe("MultiSigSubmitter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAutofill.mockImplementation((tx: Record<string, unknown>) => ({
      ...tx,
      Sequence: 100,
      Fee: "12",
      LastLedgerSequence: 200,
    }));
    mockSubmitAndWait.mockResolvedValue({
      result: {
        hash: "0xMultiSigTxHash",
        meta: { ledger_index: 42 },
        ledger_index: 42,
      },
    });
  });

  describe("constructor and connection", () => {
    it("constructs with valid config", () => {
      const config = makeConfig();
      const submitter = new MultiSigSubmitter(config);
      expect(submitter).toBeDefined();
      expect(submitter.isConnected()).toBe(false);
    });

    it("connect initializes client and wallets", async () => {
      const submitter = new MultiSigSubmitter(makeConfig());
      await submitter.connect();
      expect(mockConnect).toHaveBeenCalledOnce();
      expect(submitter.isConnected()).toBe(true);
    });

    it("disconnect cleans up client and wallets", async () => {
      const submitter = new MultiSigSubmitter(makeConfig());
      await submitter.connect();
      await submitter.disconnect();
      expect(mockDisconnect).toHaveBeenCalledOnce();
    });
  });

  describe("submit", () => {
    it("2-of-3 multi-sig succeeds", async () => {
      const config = makeConfig(3);
      const store = makeGovernanceStore(3, 2);
      const policy = store.getCurrentPolicy();

      const submitter = new MultiSigSubmitter(config);
      await submitter.connect();

      const record = await submitter.submit(makePayload(), policy);

      expect(record.id).toMatch(/^witness:multisig:/);
      expect(record.chainId).toBe("xrpl:testnet");
      expect(record.witnessAccount).toBe("rMultiSigAccount");
      expect(record.txHash).toBe("0xMultiSigTxHash");
      expect(record.ledgerIndex).toBe(42);
      expect(record.payload.hash).toBe("abc123");
    });

    it("builds 1-drop self-send payment with memo", async () => {
      const config = makeConfig(2);
      const store = makeGovernanceStore(2, 2);
      const policy = store.getCurrentPolicy();

      const submitter = new MultiSigSubmitter(config);
      await submitter.connect();

      await submitter.submit(makePayload(), policy);

      // Verify autofill was called with self-send payment
      expect(mockAutofill).toHaveBeenCalledOnce();
      const tx = mockAutofill.mock.calls[0]![0];
      expect(tx.TransactionType).toBe("Payment");
      expect(tx.Account).toBe("rMultiSigAccount");
      expect(tx.Destination).toBe("rMultiSigAccount");
      expect(tx.Amount).toBe("1");
      expect(tx.Memos).toBeDefined();
      expect(tx.Memos.length).toBe(1);
    });

    it("throws when not connected", async () => {
      const config = makeConfig();
      const store = makeGovernanceStore();
      const policy = store.getCurrentPolicy();

      const submitter = new MultiSigSubmitter(config);

      await expect(submitter.submit(makePayload(), policy)).rejects.toThrow(
        "not connected",
      );
    });

    it("wraps errors in WitnessSubmitError", async () => {
      const config = makeConfig(3);
      const store = makeGovernanceStore(3, 2);
      const policy = store.getCurrentPolicy();

      mockSubmitAndWait.mockRejectedValue(new Error("tembad_amount"));

      const submitter = new MultiSigSubmitter(config);
      await submitter.connect();

      await expect(submitter.submit(makePayload(), policy)).rejects.toThrow(
        "Witness submission failed",
      );
    });
  });

  describe("buildTransaction", () => {
    it("returns memo and transaction details", () => {
      const submitter = new MultiSigSubmitter(makeConfig());
      const result = submitter.buildTransaction(makePayload());

      expect(result.account).toBe("rMultiSigAccount");
      expect(result.destination).toBe("rMultiSigAccount");
      expect(result.amount).toBe("1");
      expect(result.memo).toBeDefined();
      expect(result.memo.MemoType).toBeDefined();
      expect(result.memo.MemoData).toBeDefined();
    });
  });

  describe("timestamp normalization", () => {
    it("normalizeTimestamp produces ISO 8601 UTC strings", () => {
      const date = new Date("2025-06-15T12:30:00Z");
      const result = normalizeTimestamp(date);
      expect(result).toBe("2025-06-15T12:30:00.000Z");
    });

    it("normalizeTimestamp is consistent for same input", () => {
      const date = new Date("2025-01-01T00:00:00Z");
      const r1 = normalizeTimestamp(date);
      const r2 = normalizeTimestamp(date);
      expect(r1).toBe(r2);
    });

    it("normalizeTimestamp always ends with Z (UTC)", () => {
      const date = new Date();
      const result = normalizeTimestamp(date);
      expect(result).toMatch(/Z$/);
    });
  });

  describe("fee handling", () => {
    it("includes feeDrops when configured", async () => {
      const config: MultiSigConfig = {
        ...makeConfig(2),
        feeDrops: "15",
      };
      const store = makeGovernanceStore(2, 2);
      const policy = store.getCurrentPolicy();

      const submitter = new MultiSigSubmitter(config);
      await submitter.connect();

      await submitter.submit(makePayload(), policy);

      const tx = mockAutofill.mock.calls[0]![0];
      expect(tx.Fee).toBe("15");
    });

    it("omits fee when not configured", async () => {
      const config = makeConfig(2);
      const store = makeGovernanceStore(2, 2);
      const policy = store.getCurrentPolicy();

      const submitter = new MultiSigSubmitter(config);
      await submitter.connect();

      await submitter.submit(makePayload(), policy);

      const tx = mockAutofill.mock.calls[0]![0];
      expect(tx.Fee).toBeUndefined();
    });
  });
});
