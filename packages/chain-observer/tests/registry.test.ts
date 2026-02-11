/**
 * Tests for ObserverRegistry.
 *
 * Uses mock ChainObserver implementations to test registry logic
 * without any network calls.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ObserverRegistry } from "../src/registry.js";
import type {
  ChainObserver,
  ObserverConfig,
  BalanceQuery,
  BalanceResult,
  TokenBalance,
  TokenBalanceQuery,
  TransferEvent,
  TransferQuery,
  ConnectionStatus,
} from "../src/observer.js";
import { CHAINS } from "../src/chains.js";
import { ETHEREUM_PROFILE } from "../src/profiles.js";

// =============================================================================
// Mock Observer
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
    } satisfies ConnectionStatus),
    getBalance: vi.fn().mockResolvedValue({
      chainId,
      address: "0xabc",
      balance: "1000000000000000000",
      decimals: 18,
      symbol: "ETH",
      atBlock: 100,
      observedAt: new Date().toISOString(),
    } satisfies BalanceResult),
    getTokenBalance: vi.fn().mockResolvedValue({
      chainId,
      address: "0xabc",
      token: "0xtoken",
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

describe("ObserverRegistry", () => {
  let registry: ObserverRegistry;

  beforeEach(() => {
    registry = new ObserverRegistry();
  });

  describe("register / unregister", () => {
    it("registers an observer", () => {
      const observer = createMockObserver("eip155:1");
      registry.register(observer);
      expect(registry.has("eip155:1")).toBe(true);
    });

    it("throws on duplicate registration", () => {
      const observer = createMockObserver("eip155:1");
      registry.register(observer);
      expect(() => registry.register(observer)).toThrow(
        "already registered"
      );
    });

    it("unregisters an observer", () => {
      const observer = createMockObserver("eip155:1");
      registry.register(observer);
      expect(registry.unregister("eip155:1")).toBe(true);
      expect(registry.has("eip155:1")).toBe(false);
    });

    it("returns false when unregistering unknown chain", () => {
      expect(registry.unregister("eip155:999")).toBe(false);
    });
  });

  describe("get", () => {
    it("returns registered observer", () => {
      const observer = createMockObserver("eip155:1");
      registry.register(observer);
      expect(registry.get("eip155:1")).toBe(observer);
    });

    it("throws for unknown chain", () => {
      expect(() => registry.get("eip155:999")).toThrow(
        "no observer registered"
      );
    });
  });

  describe("listChains", () => {
    it("returns empty array when no observers registered", () => {
      expect(registry.listChains()).toEqual([]);
    });

    it("lists all registered chain IDs", () => {
      registry.register(createMockObserver("eip155:1"));
      registry.register(createMockObserver("xrpl:main"));
      const chains = registry.listChains();
      expect(chains).toContain("eip155:1");
      expect(chains).toContain("xrpl:main");
      expect(chains.length).toBe(2);
    });
  });

  describe("connectAll", () => {
    it("connects all observers and returns statuses", async () => {
      const eth = createMockObserver("eip155:1");
      const xrpl = createMockObserver("xrpl:main");
      registry.register(eth);
      registry.register(xrpl);

      const result = await registry.connectAll();

      expect(eth.connect).toHaveBeenCalled();
      expect(xrpl.connect).toHaveBeenCalled();
      expect(result.successes.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it("captures errors for failing observers", async () => {
      const eth = createMockObserver("eip155:1");
      const failing = createMockObserver("xrpl:main");
      (failing.connect as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Connection refused")
      );
      registry.register(eth);
      registry.register(failing);

      const result = await registry.connectAll();

      expect(result.successes.length).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]!.error).toContain("Connection refused");
    });
  });

  describe("disconnectAll", () => {
    it("disconnects all observers", async () => {
      const eth = createMockObserver("eip155:1");
      const xrpl = createMockObserver("xrpl:main");
      registry.register(eth);
      registry.register(xrpl);

      await registry.disconnectAll();

      expect(eth.disconnect).toHaveBeenCalled();
      expect(xrpl.disconnect).toHaveBeenCalled();
    });
  });

  describe("getStatusAll", () => {
    it("returns statuses for all observers", async () => {
      registry.register(createMockObserver("eip155:1"));
      registry.register(createMockObserver("xrpl:main"));

      const result = await registry.getStatusAll();

      expect(result.successes.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });
  });

  describe("getBalanceMultiChain", () => {
    it("queries balance across all chains", async () => {
      registry.register(createMockObserver("eip155:1"));
      registry.register(createMockObserver("xrpl:main"));

      const query: BalanceQuery = { address: "0xabc" };
      const result = await registry.getBalanceMultiChain(query);

      expect(result.successes.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it("queries balance for specific chains only", async () => {
      registry.register(createMockObserver("eip155:1"));
      registry.register(createMockObserver("eip155:8453"));
      registry.register(createMockObserver("xrpl:main"));

      const query: BalanceQuery = { address: "0xabc" };
      const result = await registry.getBalanceMultiChain(query, [
        "eip155:1",
        "eip155:8453",
      ]);

      expect(result.successes.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it("reports errors for missing chains", async () => {
      registry.register(createMockObserver("eip155:1"));

      const query: BalanceQuery = { address: "0xabc" };
      const result = await registry.getBalanceMultiChain(query, [
        "eip155:1",
        "eip155:999",
      ]);

      expect(result.successes.length).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    it("handles partial failures gracefully", async () => {
      const working = createMockObserver("eip155:1");
      const broken = createMockObserver("xrpl:main");
      (broken.getBalance as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      registry.register(working);
      registry.register(broken);

      const result = await registry.getBalanceMultiChain({ address: "0xabc" });

      expect(result.successes.length).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]!.error).toContain("Network error");
    });
  });

  describe("backward compatibility with extended config", () => {
    it("ObserverConfig without profile still type-checks", () => {
      const config: ObserverConfig = {
        chain: CHAINS.ETHEREUM_MAINNET,
        rpcUrl: "https://eth.example.com",
      };
      expect(config.profile).toBeUndefined();
    });

    it("ObserverConfig with profile accepts ChainProfile", () => {
      const config: ObserverConfig = {
        chain: CHAINS.ETHEREUM_MAINNET,
        rpcUrl: "https://eth.example.com",
        profile: ETHEREUM_PROFILE,
      };
      expect(config.profile).toBeDefined();
      expect(config.profile!.chain.chainId).toBe("eip155:1");
      expect(config.profile!.finality.confirmations).toBe(12);
    });

    it("ConnectionStatus without finalized/safe blocks still type-checks", () => {
      const status: ConnectionStatus = {
        chainId: "eip155:1",
        connected: true,
        latestBlock: 100,
        checkedAt: new Date().toISOString(),
      };
      expect(status.finalizedBlock).toBeUndefined();
      expect(status.safeBlock).toBeUndefined();
    });

    it("ConnectionStatus with finalized/safe blocks works", () => {
      const status: ConnectionStatus = {
        chainId: "eip155:1",
        connected: true,
        latestBlock: 100,
        checkedAt: new Date().toISOString(),
        finalizedBlock: 36,
        safeBlock: 88,
      };
      expect(status.finalizedBlock).toBe(36);
      expect(status.safeBlock).toBe(88);
    });

    it("BalanceQuery without finality still type-checks", () => {
      const query: BalanceQuery = { address: "0xabc" };
      expect(query.finality).toBeUndefined();
    });

    it("BalanceQuery with finality accepts commitment level", () => {
      const query: BalanceQuery = {
        address: "0xabc",
        finality: "confirmed",
      };
      expect(query.finality).toBe("confirmed");
    });

    it("TransferQuery without finality still type-checks", () => {
      const query: TransferQuery = { address: "0xabc" };
      expect(query.finality).toBeUndefined();
    });

    it("TransferQuery with finality accepts commitment level", () => {
      const query: TransferQuery = {
        address: "0xabc",
        finality: "finalized",
      };
      expect(query.finality).toBe("finalized");
    });

    it("mock observers still satisfy ChainObserver interface", () => {
      // Existing mock observers must still work — all new fields are optional
      const observer = createMockObserver("eip155:1");
      registry.register(observer);
      expect(registry.has("eip155:1")).toBe(true);
    });
  });
});
