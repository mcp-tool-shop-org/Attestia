/**
 * Tests for XrplEvmAdapter.
 *
 * Verifies that the adapter delegates to EvmObserver for all standard
 * operations and adds bridge transaction detection on top.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { XrplEvmAdapter } from "../../src/xrpl-evm/xrpl-evm-adapter.js";
import { KNOWN_BRIDGE_CONTRACTS } from "../../src/xrpl-evm/bridge-event.js";
import { CHAINS } from "../../src/chains.js";
import type { ObserverConfig } from "../../src/observer.js";

// =============================================================================
// Mocks
// =============================================================================

const mockGetBlockNumber = vi.fn().mockResolvedValue(100n);
const mockGetBalance = vi.fn().mockResolvedValue(1000000000000000000n);
const mockReadContract = vi.fn();
const mockGetLogs = vi.fn().mockResolvedValue([]);
const mockGetBlock = vi.fn();

vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBlockNumber: mockGetBlockNumber,
      getBalance: mockGetBalance,
      readContract: mockReadContract,
      getLogs: mockGetLogs,
      getBlock: mockGetBlock,
    })),
  };
});

function createConfig(): ObserverConfig {
  return {
    chain: CHAINS.XRPL_EVM_DEVNET,
    rpcUrl: "https://mock-xrpl-evm-rpc.example.com",
    timeoutMs: 5000,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("XrplEvmAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContract.mockReset();
    mockGetLogs.mockResolvedValue([]);
    mockGetBlock.mockReset();
  });

  describe("constructor", () => {
    it("creates adapter with correct chainId", () => {
      const adapter = new XrplEvmAdapter(createConfig());
      expect(adapter.chainId).toBe("eip155:1440002");
    });

    it("accepts custom XRPL chain ID for bridge references", () => {
      const adapter = new XrplEvmAdapter(createConfig(), "xrpl:testnet");
      expect(adapter.chainId).toBe("eip155:1440002");
    });
  });

  describe("delegation to EvmObserver", () => {
    it("delegates connect()", async () => {
      const adapter = new XrplEvmAdapter(createConfig());
      await expect(adapter.connect()).resolves.toBeUndefined();
    });

    it("delegates disconnect()", async () => {
      const adapter = new XrplEvmAdapter(createConfig());
      await adapter.connect();
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it("delegates getStatus()", async () => {
      const adapter = new XrplEvmAdapter(createConfig());
      await adapter.connect();

      const status = await adapter.getStatus();

      expect(status.chainId).toBe("eip155:1440002");
      expect(status.connected).toBe(true);
    });

    it("delegates getBalance()", async () => {
      const adapter = new XrplEvmAdapter(createConfig());
      await adapter.connect();

      const result = await adapter.getBalance({
        address: "0x1234567890abcdef1234567890abcdef12345678",
      });

      expect(result.chainId).toBe("eip155:1440002");
      expect(result.balance).toBe("1000000000000000000");
    });

    it("delegates getTransfers()", async () => {
      const adapter = new XrplEvmAdapter(createConfig());
      await adapter.connect();

      const result = await adapter.getTransfers({
        address: "0x1234567890abcdef1234567890abcdef12345678",
        direction: "incoming",
        fromBlock: 1,
        toBlock: 100,
      });

      expect(result).toEqual([]);
    });
  });

  describe("detectBridgeTransfers", () => {
    it("returns empty array when no bridge transactions", async () => {
      mockGetLogs.mockResolvedValueOnce([
        {
          transactionHash: "0xregular",
          blockNumber: 50n,
          address: "0xregular-token",
          args: {
            from: "0xsender",
            to: "0x1234567890abcdef1234567890abcdef12345678",
            value: 1000n,
          },
        },
      ]);
      mockReadContract
        .mockResolvedValueOnce("TOKEN")
        .mockResolvedValueOnce(18);

      const adapter = new XrplEvmAdapter(createConfig());
      await adapter.connect();

      const bridges = await adapter.detectBridgeTransfers({
        address: "0x1234567890abcdef1234567890abcdef12345678",
        direction: "incoming",
        fromBlock: 1,
        toBlock: 100,
      });

      expect(bridges.length).toBe(0);
    });

    it("detects bridge transactions involving known bridge contracts", async () => {
      const bridgeAddr = [...KNOWN_BRIDGE_CONTRACTS][0]!;

      mockGetLogs.mockResolvedValueOnce([
        {
          transactionHash: "0xbridge-tx",
          blockNumber: 50n,
          address: bridgeAddr,
          args: {
            from: bridgeAddr,
            to: "0x1234567890abcdef1234567890abcdef12345678",
            value: 5000000n,
          },
        },
      ]);
      mockReadContract
        .mockResolvedValueOnce("XRP")
        .mockResolvedValueOnce(6);

      const adapter = new XrplEvmAdapter(createConfig());
      await adapter.connect();

      const bridges = await adapter.detectBridgeTransfers({
        address: "0x1234567890abcdef1234567890abcdef12345678",
        direction: "incoming",
        fromBlock: 1,
        toBlock: 100,
      });

      expect(bridges.length).toBe(1);
      expect(bridges[0]!.sourceChainId).toBe("eip155:1440002");
      expect(bridges[0]!.destChainId).toBe("xrpl:main");
      expect(bridges[0]!.status).toBe("pending");
      expect(bridges[0]!.amount).toBe("5000000");
    });

    it("detects bridge when token address is a bridge contract", async () => {
      const bridgeAddr = [...KNOWN_BRIDGE_CONTRACTS][0]!;

      mockGetLogs.mockResolvedValueOnce([
        {
          transactionHash: "0xbridge-token-tx",
          blockNumber: 60n,
          address: bridgeAddr,
          args: {
            from: "0xsender",
            to: "0xrecipient",
            value: 1000n,
          },
        },
      ]);
      mockReadContract
        .mockResolvedValueOnce("BRIDGE-TOK")
        .mockResolvedValueOnce(18);

      const adapter = new XrplEvmAdapter(createConfig());
      await adapter.connect();

      const bridges = await adapter.detectBridgeTransfers({
        address: "0xrecipient",
        direction: "incoming",
        fromBlock: 1,
        toBlock: 100,
      });

      expect(bridges.length).toBe(1);
      expect(bridges[0]!.sourceTxHash).toBe("0xbridge-token-tx");
    });
  });

  describe("createCrossChainRef", () => {
    it("creates a confirmed bridge event with both tx hashes", () => {
      const adapter = new XrplEvmAdapter(createConfig());

      const ref = adapter.createCrossChainRef(
        "XRPL_TX_HASH_123",
        "0xevm-tx-hash",
        {
          amount: "5000000",
          symbol: "XRP",
          sender: "rSenderAddress",
          recipient: "0xRecipientAddr",
          sourceTimestamp: "2025-01-01T00:00:00Z",
          destTimestamp: "2025-01-01T00:00:30Z",
        },
      );

      expect(ref.sourceChainId).toBe("xrpl:main");
      expect(ref.destChainId).toBe("eip155:1440002");
      expect(ref.sourceTxHash).toBe("xrpl_tx_hash_123"); // lowercased
      expect(ref.destTxHash).toBe("0xevm-tx-hash");
      expect(ref.status).toBe("confirmed");
      expect(ref.amount).toBe("5000000");
    });

    it("includes bridge proof ref when provided", () => {
      const adapter = new XrplEvmAdapter(createConfig());

      const ref = adapter.createCrossChainRef(
        "XRPL_TX_HASH_456",
        "0xevm-tx-hash-2",
        {
          amount: "1000000",
          symbol: "XRP",
          sender: "rSender",
          recipient: "0xRecip",
          sourceTimestamp: "2025-01-01T00:00:00Z",
          bridgeProofRef: "attestation:abc123",
        },
      );

      expect(ref.bridgeProofRef).toBe("attestation:abc123");
    });
  });
});
