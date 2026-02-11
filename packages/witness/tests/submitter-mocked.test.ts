/**
 * Tests for XrplSubmitter with mocked XRPL client.
 *
 * Covers: submit() with mocked autofill/sign/submitAndWait,
 * connect/disconnect lifecycle, and isConnected states.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { XrplSubmitter } from "../src/submitter.js";
import { buildReconciliationPayload } from "../src/payload.js";
import type { AttestationPayload, WitnessConfig } from "../src/types.js";
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

function makePayload(): AttestationPayload {
  return buildReconciliationPayload(
    {
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
    },
    {
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
    },
  );
}

function injectMockClientAndWallet(submitter: XrplSubmitter) {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    autofill: vi.fn().mockImplementation((tx: unknown) => tx),
    submitAndWait: vi.fn().mockResolvedValue({
      result: {
        meta: { ledger_index: 999 },
      },
    }),
  };
  const mockWallet = {
    sign: vi.fn().mockReturnValue({
      tx_blob: "SIGNED_BLOB",
      hash: "TXHASH_ABC123",
    }),
  };

  (submitter as unknown as { client: unknown }).client = mockClient;
  (submitter as unknown as { wallet: unknown }).wallet = mockWallet;

  return { mockClient, mockWallet };
}

// =============================================================================
// Tests
// =============================================================================

describe("XrplSubmitter (mocked)", () => {
  let submitter: XrplSubmitter;

  beforeEach(() => {
    submitter = new XrplSubmitter(testConfig);
  });

  describe("submit()", () => {
    it("returns a WitnessRecord on successful submission", async () => {
      const payload = makePayload();
      injectMockClientAndWallet(submitter);

      const record = await submitter.submit(payload);

      expect(record.id).toContain("witness:");
      expect(record.txHash).toBe("TXHASH_ABC123");
      expect(record.ledgerIndex).toBe(999);
      expect(record.chainId).toBe("xrpl:testnet");
      expect(record.witnessAccount).toBe("rTestAccount");
      expect(record.payload.hash).toBe(payload.hash);
    });

    it("calls autofill, sign, and submitAndWait in order", async () => {
      const payload = makePayload();
      const { mockClient, mockWallet } = injectMockClientAndWallet(submitter);

      await submitter.submit(payload);

      expect(mockClient.autofill).toHaveBeenCalledOnce();
      expect(mockWallet.sign).toHaveBeenCalledOnce();
      expect(mockClient.submitAndWait).toHaveBeenCalledWith("SIGNED_BLOB");
    });

    it("falls back to result.ledger_index when meta lacks it", async () => {
      const payload = makePayload();
      const { mockClient } = injectMockClientAndWallet(submitter);

      mockClient.submitAndWait.mockResolvedValue({
        result: {
          meta: "tesSUCCESS", // string meta, not object
          ledger_index: 555,
        },
      });

      const record = await submitter.submit(payload);
      expect(record.ledgerIndex).toBe(555);
    });

    it("defaults to ledgerIndex 0 when neither meta nor result has it", async () => {
      const payload = makePayload();
      const { mockClient } = injectMockClientAndWallet(submitter);

      mockClient.submitAndWait.mockResolvedValue({
        result: {
          meta: "tesSUCCESS",
        },
      });

      const record = await submitter.submit(payload);
      expect(record.ledgerIndex).toBe(0);
    });

    it("includes Fee when config has feeDrops", async () => {
      const configWithFee: WitnessConfig = { ...testConfig, feeDrops: "15" };
      const sub = new XrplSubmitter(configWithFee);
      const { mockClient } = injectMockClientAndWallet(sub);

      await sub.submit(makePayload());

      const autofillArg = mockClient.autofill.mock.calls[0]![0] as Record<string, unknown>;
      expect(autofillArg.Fee).toBe("15");
    });
  });

  describe("disconnect()", () => {
    it("disconnects when connected", async () => {
      const { mockClient } = injectMockClientAndWallet(submitter);

      await submitter.disconnect();

      expect(mockClient.disconnect).toHaveBeenCalledOnce();
      expect(submitter.isConnected()).toBe(false);
    });

    it("is safe when not connected", async () => {
      // Should not throw
      await submitter.disconnect();
    });
  });
});
