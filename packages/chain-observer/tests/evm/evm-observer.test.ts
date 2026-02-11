/**
 * Tests for EvmObserver.
 *
 * Uses vitest mocking to mock viem's createPublicClient.
 * No actual RPC calls are made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvmObserver } from "../../src/evm/evm-observer.js";
import { CHAINS } from "../../src/chains.js";
import type { ObserverConfig } from "../../src/observer.js";

// =============================================================================
// Mocks
// =============================================================================

const mockGetBlockNumber = vi.fn().mockResolvedValue(12345n);
const mockGetBalance = vi.fn().mockResolvedValue(1000000000000000000n);
const mockReadContract = vi.fn();
const mockGetLogs = vi.fn().mockResolvedValue([]);

vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBlockNumber: mockGetBlockNumber,
      getBalance: mockGetBalance,
      readContract: mockReadContract,
      getLogs: mockGetLogs,
    })),
  };
});

function createConfig(
  chain = CHAINS.ETHEREUM_MAINNET
): ObserverConfig {
  return {
    chain,
    rpcUrl: "https://mock-rpc.example.com",
    timeoutMs: 5000,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("EvmObserver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContract.mockReset();
    mockGetLogs.mockResolvedValue([]);
  });

  describe("constructor", () => {
    it("creates observer for EVM chain", () => {
      const observer = new EvmObserver(createConfig());
      expect(observer.chainId).toBe("eip155:1");
    });

    it("rejects non-EVM chain IDs", () => {
      expect(
        () =>
          new EvmObserver(createConfig(CHAINS.XRPL_MAINNET))
      ).toThrow("expected EVM chain ID");
    });
  });

  describe("connect / disconnect", () => {
    it("connects successfully", async () => {
      const observer = new EvmObserver(createConfig());
      await expect(observer.connect()).resolves.toBeUndefined();
    });

    it("disconnects cleanly", async () => {
      const observer = new EvmObserver(createConfig());
      await observer.connect();
      await expect(observer.disconnect()).resolves.toBeUndefined();
    });
  });

  describe("getStatus", () => {
    it("returns connected with block number", async () => {
      const observer = new EvmObserver(createConfig());
      await observer.connect();

      const status = await observer.getStatus();

      expect(status.chainId).toBe("eip155:1");
      expect(status.connected).toBe(true);
      expect(status.latestBlock).toBe(12345);
    });

    it("returns disconnected when not connected", async () => {
      const observer = new EvmObserver(createConfig());

      const status = await observer.getStatus();

      expect(status.connected).toBe(false);
    });
  });

  describe("getBalance", () => {
    it("returns native ETH balance", async () => {
      const observer = new EvmObserver(createConfig());
      await observer.connect();

      const result = await observer.getBalance({
        address: "0x1234567890abcdef1234567890abcdef12345678",
      });

      expect(result.chainId).toBe("eip155:1");
      expect(result.balance).toBe("1000000000000000000");
      expect(result.decimals).toBe(18);
      expect(result.symbol).toBe("ETH");
    });

    it("throws when not connected", async () => {
      const observer = new EvmObserver(createConfig());
      await expect(
        observer.getBalance({ address: "0xabc" })
      ).rejects.toThrow("not connected");
    });
  });

  describe("getTokenBalance", () => {
    it("returns ERC-20 token balance", async () => {
      mockReadContract
        .mockResolvedValueOnce(1000000n) // balanceOf
        .mockResolvedValueOnce("USDC") // symbol
        .mockResolvedValueOnce(6); // decimals

      const observer = new EvmObserver(createConfig());
      await observer.connect();

      const result = await observer.getTokenBalance({
        address: "0x1234567890abcdef1234567890abcdef12345678",
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      });

      expect(result.symbol).toBe("USDC");
      expect(result.balance).toBe("1000000");
      expect(result.decimals).toBe(6);
    });
  });

  describe("getTransfers", () => {
    it("returns empty array when no transfers found", async () => {
      const observer = new EvmObserver(createConfig());
      await observer.connect();

      const result = await observer.getTransfers({
        address: "0x1234567890abcdef1234567890abcdef12345678",
        fromBlock: 100,
        toBlock: 200,
      });

      expect(result).toEqual([]);
    });

    it("maps Transfer logs to TransferEvent", async () => {
      mockGetLogs.mockResolvedValueOnce([
        {
          transactionHash: "0xdeadbeef",
          blockNumber: 150n,
          address: "0xtoken",
          args: {
            from: "0xsender",
            to: "0x1234567890abcdef1234567890abcdef12345678",
            value: 500000n,
          },
        },
      ]);

      const observer = new EvmObserver(createConfig());
      await observer.connect();

      const result = await observer.getTransfers({
        address: "0x1234567890abcdef1234567890abcdef12345678",
        direction: "incoming",
        token: "0xtoken",
        fromBlock: 100,
        toBlock: 200,
      });

      expect(result.length).toBe(1);
      expect(result[0]!.txHash).toBe("0xdeadbeef");
      expect(result[0]!.from).toBe("0xsender");
      expect(result[0]!.amount).toBe("500000");
    });
  });
});
