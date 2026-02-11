/**
 * Tests for PortfolioObserver — multi-chain portfolio aggregation.
 *
 * Uses mock ChainObservers via ObserverRegistry.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PortfolioObserver } from "../src/portfolio.js";
import { ObserverRegistry } from "@attestia/chain-observer";
import type { ChainObserver, BalanceResult, TokenBalance, TransferEvent } from "@attestia/chain-observer";
import type { WatchedAddress } from "../src/types.js";

// =============================================================================
// Mock observer factory
// =============================================================================

function createMockObserver(chainId: string, balance: string, symbol: string, decimals: number): ChainObserver {
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
      address: "0xAddress",
      balance,
      decimals,
      symbol,
      atBlock: 100,
      observedAt: new Date().toISOString(),
    } satisfies BalanceResult),
    getTokenBalance: vi.fn().mockResolvedValue({
      chainId,
      address: "0xAddress",
      token: "0xToken",
      symbol: "USDC",
      balance: "1000000",
      decimals: 6,
      observedAt: new Date().toISOString(),
    } satisfies TokenBalance),
    getTransfers: vi.fn().mockResolvedValue([] as readonly TransferEvent[]),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("PortfolioObserver", () => {
  let registry: ObserverRegistry;
  let portfolio: PortfolioObserver;

  beforeEach(() => {
    registry = new ObserverRegistry();
  });

  describe("observe", () => {
    it("aggregates native balances across chains", async () => {
      // ETH on mainnet: 2 ETH
      registry.register(
        createMockObserver("eip155:1", "2000000000000000000", "ETH", 18),
      );
      // ETH on Base: 0.5 ETH
      registry.register(
        createMockObserver("eip155:8453", "500000000000000000", "ETH", 18),
      );

      portfolio = new PortfolioObserver(registry);

      const addresses: WatchedAddress[] = [
        { chainId: "eip155:1", address: "0xMyAddr" },
        { chainId: "eip155:8453", address: "0xMyAddr" },
      ];

      const result = await portfolio.observe("owner-1", addresses);

      expect(result.ownerId).toBe("owner-1");
      expect(result.nativePositions.length).toBe(2);
      expect(result.totals.length).toBe(1);
      expect(result.totals[0]!.currency).toBe("ETH");
      expect(result.totals[0]!.totalBalance).toBe("2.500000000000000000");
      expect(result.totals[0]!.chainCount).toBe(2);
    });

    it("handles multiple currencies", async () => {
      registry.register(
        createMockObserver("eip155:1", "1000000000000000000", "ETH", 18),
      );
      registry.register(
        createMockObserver("xrpl:main", "50000000", "XRP", 6),
      );

      portfolio = new PortfolioObserver(registry);

      const addresses: WatchedAddress[] = [
        { chainId: "eip155:1", address: "0xMyAddr" },
        { chainId: "xrpl:main", address: "rMyXrplAddr" },
      ];

      const result = await portfolio.observe("owner-1", addresses);

      expect(result.nativePositions.length).toBe(2);
      expect(result.totals.length).toBe(2);

      const ethTotal = result.totals.find((t) => t.currency === "ETH");
      const xrpTotal = result.totals.find((t) => t.currency === "XRP");
      expect(ethTotal?.totalBalance).toBe("1.000000000000000000");
      expect(xrpTotal?.totalBalance).toBe("50.000000");
    });

    it("skips chains without registered observers", async () => {
      registry.register(
        createMockObserver("eip155:1", "1000000000000000000", "ETH", 18),
      );

      portfolio = new PortfolioObserver(registry);

      const addresses: WatchedAddress[] = [
        { chainId: "eip155:1", address: "0xMyAddr" },
        { chainId: "eip155:999", address: "0xMyAddr" }, // No observer
      ];

      const result = await portfolio.observe("owner-1", addresses);

      expect(result.nativePositions.length).toBe(1);
    });

    it("handles observer errors gracefully", async () => {
      const failing = createMockObserver("eip155:1", "0", "ETH", 18);
      (failing.getBalance as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("RPC timeout"),
      );
      registry.register(failing);

      portfolio = new PortfolioObserver(registry);

      const result = await portfolio.observe("owner-1", [
        { chainId: "eip155:1", address: "0xMyAddr" },
      ]);

      // Should not throw, but position won't be included
      expect(result.nativePositions.length).toBe(0);
    });
  });

  describe("observeToken", () => {
    it("returns a token position", async () => {
      registry.register(
        createMockObserver("eip155:1", "0", "ETH", 18),
      );
      portfolio = new PortfolioObserver(registry);

      const addr: WatchedAddress = {
        chainId: "eip155:1",
        address: "0xMyAddr",
      };

      const position = await portfolio.observeToken(addr, "0xUsdcContract");

      expect(position).not.toBeNull();
      expect(position!.symbol).toBe("USDC");
      expect(position!.balance).toBe("1000000");
    });

    it("returns null for unknown chain", async () => {
      portfolio = new PortfolioObserver(registry);

      const position = await portfolio.observeToken(
        { chainId: "eip155:999", address: "0xMyAddr" },
        "0xToken",
      );

      expect(position).toBeNull();
    });
  });

  describe("getTransfers", () => {
    it("returns empty array for chain without observer", async () => {
      portfolio = new PortfolioObserver(registry);

      const transfers = await portfolio.getTransfers({
        chainId: "eip155:999",
        address: "0xMyAddr",
      });

      expect(transfers).toEqual([]);
    });

    it("delegates to observer", async () => {
      const mockEvents: TransferEvent[] = [
        {
          chainId: "eip155:1",
          txHash: "0xHash1",
          blockNumber: 100,
          from: "0xSender",
          to: "0xMyAddr",
          amount: "1000000",
          decimals: 6,
          symbol: "USDC",
          token: "0xUsdcAddr",
          timestamp: new Date().toISOString(),
          observedAt: new Date().toISOString(),
        },
      ];

      const observer = createMockObserver("eip155:1", "0", "ETH", 18);
      (observer.getTransfers as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockEvents,
      );
      registry.register(observer);

      portfolio = new PortfolioObserver(registry);

      const transfers = await portfolio.getTransfers(
        { chainId: "eip155:1", address: "0xMyAddr" },
        { direction: "incoming", limit: 10 },
      );

      expect(transfers.length).toBe(1);
      expect(transfers[0]!.txHash).toBe("0xHash1");
    });
  });
});
