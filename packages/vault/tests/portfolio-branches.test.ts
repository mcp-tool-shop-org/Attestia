/**
 * Tests for PortfolioObserver branch coverage gaps.
 *
 * Covers:
 * - observeToken with issuer parameter
 * - observeToken error handling (catch → null)
 */

import { describe, it, expect, vi } from "vitest";
import { PortfolioObserver } from "../src/portfolio.js";
import { ObserverRegistry } from "@attestia/chain-observer";
import type { ChainObserver, BalanceResult, TokenBalance, TransferEvent } from "@attestia/chain-observer";
import type { WatchedAddress } from "../src/types.js";

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
      token: "0xToken",
      symbol: "USDC",
      balance: "1000000",
      decimals: 6,
      observedAt: new Date().toISOString(),
    } satisfies TokenBalance),
    getTransfers: vi.fn().mockResolvedValue([] as readonly TransferEvent[]),
  };
}

describe("PortfolioObserver branch coverage", () => {
  describe("observeToken with issuer", () => {
    it("passes issuer to getTokenBalance when provided", async () => {
      const registry = new ObserverRegistry();
      const observer = createMockObserver("xrpl:main");
      registry.register(observer);

      const portfolio = new PortfolioObserver(registry);
      const addr: WatchedAddress = { chainId: "xrpl:main", address: "rMyAddr" };

      const position = await portfolio.observeToken(addr, "USD", "rIssuerAddr");

      expect(position).not.toBeNull();
      expect(observer.getTokenBalance).toHaveBeenCalledWith({
        address: "rMyAddr",
        token: "USD",
        issuer: "rIssuerAddr",
      });
    });

    it("omits issuer from query when not provided", async () => {
      const registry = new ObserverRegistry();
      const observer = createMockObserver("eip155:1");
      registry.register(observer);

      const portfolio = new PortfolioObserver(registry);
      const addr: WatchedAddress = { chainId: "eip155:1", address: "0xAddr" };

      await portfolio.observeToken(addr, "0xToken");

      expect(observer.getTokenBalance).toHaveBeenCalledWith({
        address: "0xAddr",
        token: "0xToken",
      });
    });
  });

  describe("observeToken error handling", () => {
    it("returns null when getTokenBalance throws", async () => {
      const registry = new ObserverRegistry();
      const observer = createMockObserver("eip155:1");
      (observer.getTokenBalance as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("RPC timeout"),
      );
      registry.register(observer);

      const portfolio = new PortfolioObserver(registry);
      const addr: WatchedAddress = { chainId: "eip155:1", address: "0xAddr" };

      const position = await portfolio.observeToken(addr, "0xToken");

      expect(position).toBeNull();
    });
  });
});
