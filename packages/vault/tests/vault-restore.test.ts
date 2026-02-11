/**
 * Tests for Vault.restoreFromSnapshot and vault.getTransfers.
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
  watchedAddresses: [{ chainId: "eip155:1", address: "0xMyEthAddr" }],
  defaultCurrency: "USDC",
  defaultDecimals: 6,
};

// =============================================================================
// Tests
// =============================================================================

describe("Vault.restoreFromSnapshot", () => {
  let registry: ObserverRegistry;

  beforeEach(() => {
    registry = new ObserverRegistry();
    registry.register(createMockObserver("eip155:1"));
  });

  it("restores envelopes with allocations and spending", () => {
    const vault = new Vault(DEFAULT_CONFIG, registry);

    vault.createEnvelope("rent", "Monthly Rent", "housing");
    vault.allocateToEnvelope("rent", {
      amount: "2000",
      currency: "USDC",
      decimals: 6,
    });

    // Declare and execute an intent to create spending
    vault.declareIntent("i-1", "transfer", "Pay rent", {
      amount: { amount: "500", currency: "USDC", decimals: 6 },
    }, "rent");
    vault.approveIntent("i-1");
    vault.markIntentExecuting("i-1");
    vault.recordIntentExecution("i-1", "eip155:1", "0xTx");

    const snap = vault.snapshot();

    // Restore
    const restored = vault.restoreFromSnapshot(snap, registry);

    const budget = restored.getBudget();
    expect(budget.envelopes.length).toBe(1);
    expect(budget.totalAllocated).toBe("2000.000000");
    expect(budget.totalSpent).toBe("500.000000");
    expect(budget.totalAvailable).toBe("1500.000000");
  });

  it("restores intents", () => {
    const vault = new Vault(DEFAULT_CONFIG, registry);

    vault.declareIntent("i-1", "transfer", "Test intent", {});
    vault.declareIntent("i-2", "swap", "Another intent", {});

    const snap = vault.snapshot();
    const restored = vault.restoreFromSnapshot(snap, registry);

    const intents = restored.intents.exportIntents();
    expect(intents.length).toBe(2);
    expect(intents[0]!.id).toBe("i-1");
    expect(intents[1]!.id).toBe("i-2");
  });

  it("skips allocation/spending replay when values are zero", () => {
    const vault = new Vault(DEFAULT_CONFIG, registry);

    vault.createEnvelope("empty", "Empty Envelope");

    const snap = vault.snapshot();
    const restored = vault.restoreFromSnapshot(snap, registry);

    const budget = restored.getBudget();
    expect(budget.envelopes.length).toBe(1);
    expect(budget.totalAllocated).toBe("0.000000");
    expect(budget.totalSpent).toBe("0.000000");
  });

  it("restores config correctly", () => {
    const vault = new Vault(DEFAULT_CONFIG, registry);
    const snap = vault.snapshot();
    const restored = vault.restoreFromSnapshot(snap, registry);

    expect(restored.config.ownerId).toBe("user-1");
    expect(restored.config.defaultCurrency).toBe("USDC");
  });
});

describe("Vault.getTransfers", () => {
  it("delegates to portfolio observer", async () => {
    const registry = new ObserverRegistry();
    const observer = createMockObserver("eip155:1");
    registry.register(observer);

    const vault = new Vault(DEFAULT_CONFIG, registry);

    const transfers = await vault.getTransfers(
      { chainId: "eip155:1", address: "0xMyEthAddr" },
    );

    expect(transfers).toEqual([]);
    expect(observer.getTransfers).toHaveBeenCalled();
  });
});
