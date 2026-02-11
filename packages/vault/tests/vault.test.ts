/**
 * Tests for Vault — top-level coordinator.
 *
 * Integration tests verifying that the Vault correctly
 * coordinates Portfolio, Budget, and Intent subsystems.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Vault } from "../src/vault.js";
import { ObserverRegistry } from "@attestia/chain-observer";
import type { ChainObserver, BalanceResult, TokenBalance, TransferEvent } from "@attestia/chain-observer";
import type { VaultConfig } from "../src/types.js";

// =============================================================================
// Helpers
// =============================================================================

function createMockObserver(chainId: string): ChainObserver {
  return {
    chainId,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      chainId,
      connected: true,
      latestBlock: 100,
      checkedAt: new Date().toISOString(),
    }),
    getBalance: vi.fn().mockResolvedValue({
      chainId,
      address: "0xAddr",
      balance: "1000000000000000000",
      decimals: 18,
      symbol: "ETH",
      atBlock: 100,
      observedAt: new Date().toISOString(),
    } satisfies BalanceResult),
    getTokenBalance: vi.fn().mockResolvedValue({
      chainId,
      address: "0xAddr",
      token: "0xUsdc",
      symbol: "USDC",
      balance: "5000000",
      decimals: 6,
      observedAt: new Date().toISOString(),
    } satisfies TokenBalance),
    getTransfers: vi.fn().mockResolvedValue([] as readonly TransferEvent[]),
  };
}

const DEFAULT_CONFIG: VaultConfig = {
  ownerId: "user-1",
  watchedAddresses: [
    { chainId: "eip155:1", address: "0xMyEthAddr" },
  ],
  defaultCurrency: "USDC",
  defaultDecimals: 6,
};

// =============================================================================
// Tests
// =============================================================================

describe("Vault", () => {
  let registry: ObserverRegistry;
  let vault: Vault;

  beforeEach(() => {
    registry = new ObserverRegistry();
    registry.register(createMockObserver("eip155:1"));
    vault = new Vault(DEFAULT_CONFIG, registry);
  });

  describe("portfolio observation", () => {
    it("observes portfolio across watched addresses", async () => {
      const portfolio = await vault.observePortfolio();

      expect(portfolio.ownerId).toBe("user-1");
      expect(portfolio.nativePositions.length).toBe(1);
      expect(portfolio.nativePositions[0]!.symbol).toBe("ETH");
    });

    it("observes token position", async () => {
      const position = await vault.observeToken(
        { chainId: "eip155:1", address: "0xMyEthAddr" },
        "0xUsdcContract",
      );

      expect(position).not.toBeNull();
      expect(position!.symbol).toBe("USDC");
    });
  });

  describe("budget management", () => {
    it("creates envelopes and allocates funds", () => {
      vault.createEnvelope("rent", "Monthly Rent", "housing");
      vault.allocateToEnvelope("rent", {
        amount: "1500",
        currency: "USDC",
        decimals: 6,
      });

      const budget = vault.getBudget();
      expect(budget.envelopes.length).toBe(1);
      expect(budget.totalAllocated).toBe("1500.000000");
    });
  });

  describe("intent lifecycle", () => {
    it("declare → approve → execute → verify", () => {
      // Declare
      vault.declareIntent("i-1", "transfer", "Send 100 USDC to Bob", {
        amount: { amount: "100", currency: "USDC", decimals: 6 },
        toAddress: "0xBobAddr",
        toChainId: "eip155:1",
      });

      // Approve
      vault.approveIntent("i-1", "Reviewed and approved");

      // Mark executing
      vault.markIntentExecuting("i-1");

      // Record execution
      vault.recordIntentExecution("i-1", "eip155:1", "0xTxHash123");

      // Verify
      const final = vault.verifyIntent("i-1", true);

      expect(final.status).toBe("verified");
      expect(final.execution?.txHash).toBe("0xTxHash123");
      expect(final.verification?.matched).toBe(true);
    });

    it("reject stops the flow", () => {
      vault.declareIntent("i-1", "transfer", "Suspicious transfer", {
        amount: { amount: "10000", currency: "USDC", decimals: 6 },
      });

      const rejected = vault.rejectIntent("i-1", "Amount too large");

      expect(rejected.status).toBe("rejected");
      expect(rejected.approval?.approved).toBe(false);
    });

    it("integrates with budget envelopes", () => {
      vault.createEnvelope("ops", "Operations");
      vault.allocateToEnvelope("ops", {
        amount: "5000",
        currency: "USDC",
        decimals: 6,
      });

      // Declare with envelope linkage
      vault.declareIntent(
        "i-1",
        "transfer",
        "Pay vendor",
        {
          amount: { amount: "2000", currency: "USDC", decimals: 6 },
          toAddress: "0xVendor",
        },
        "ops",
      );

      vault.approveIntent("i-1");
      vault.markIntentExecuting("i-1");
      vault.recordIntentExecution("i-1", "eip155:1", "0xTx");

      // Budget should be debited
      const budget = vault.getBudget();
      expect(budget.totalSpent).toBe("2000.000000");
      expect(budget.totalAvailable).toBe("3000.000000");
    });

    it("failure reverses budget debit", () => {
      vault.createEnvelope("ops", "Operations");
      vault.allocateToEnvelope("ops", {
        amount: "5000",
        currency: "USDC",
        decimals: 6,
      });

      vault.declareIntent(
        "i-1",
        "transfer",
        "Pay vendor",
        {
          amount: { amount: "2000", currency: "USDC", decimals: 6 },
          toAddress: "0xVendor",
        },
        "ops",
      );

      vault.approveIntent("i-1");
      vault.markIntentExecuting("i-1");
      vault.recordIntentExecution("i-1", "eip155:1", "0xTx");

      // Now fail
      vault.recordIntentFailure("i-1", ["Tx reverted on chain"]);

      const budget = vault.getBudget();
      expect(budget.totalSpent).toBe("0.000000");
      expect(budget.totalAvailable).toBe("5000.000000");
    });
  });

  describe("snapshot", () => {
    it("captures full vault state", () => {
      vault.createEnvelope("rent", "Rent");
      vault.allocateToEnvelope("rent", {
        amount: "1000",
        currency: "USDC",
        decimals: 6,
      });
      vault.declareIntent("i-1", "transfer", "Test", {});

      const snap = vault.snapshot();

      expect(snap.version).toBe(1);
      expect(snap.config.ownerId).toBe("user-1");
      expect(snap.envelopes.length).toBe(1);
      expect(snap.intents.length).toBe(1);
    });
  });
});
