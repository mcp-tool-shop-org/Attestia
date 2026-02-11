/**
 * XRPL EVM Sidechain Bridge Invariant Tests
 *
 * Cross-chain replay determinism, simulated bridge failure,
 * event divergence detection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { XrplEvmAdapter } from "../../src/xrpl-evm/xrpl-evm-adapter.js";
import {
  normalizeBridgeEvent,
  bridgeEventKey,
  KNOWN_BRIDGE_CONTRACTS,
} from "../../src/xrpl-evm/bridge-event.js";
import { CHAINS } from "../../src/chains.js";
import type { BridgeEvent } from "../../src/xrpl-evm/bridge-event.js";
import type { ObserverConfig } from "../../src/observer.js";

// =============================================================================
// Mocks
// =============================================================================

const mockGetBlockNumber = vi.fn().mockResolvedValue(100n);
const mockGetBalance = vi.fn().mockResolvedValue(0n);
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
// Invariant Tests
// =============================================================================

describe("Bridge invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContract.mockReset();
    mockGetLogs.mockResolvedValue([]);
    mockGetBlock.mockReset();
  });

  describe("cross-chain replay determinism", () => {
    it("normalization is idempotent", () => {
      const event = normalizeBridgeEvent({
        sourceChainId: "xrpl:main",
        destChainId: "eip155:1440002",
        sourceTxHash: "0xABC",
        destTxHash: "0xDEF",
        amount: "00500",
        symbol: "XRP",
        sender: "0xSENDER",
        recipient: "0xRECIPIENT",
        sourceTimestamp: "2025-01-01T00:00:00Z",
        destTimestamp: "2025-01-01T00:00:30Z",
      });

      // Normalizing an already-normalized event produces identical output
      const doubleNormalized = normalizeBridgeEvent(event);
      expect(JSON.stringify(event)).toBe(JSON.stringify(doubleNormalized));
    });

    it("bridge event keys are deterministic across runs", () => {
      const keys: string[] = [];
      for (let i = 0; i < 100; i++) {
        keys.push(bridgeEventKey("xrpl:main", "0xABC123"));
      }
      const unique = new Set(keys);
      expect(unique.size).toBe(1);
    });

    it("two independent detections of same data produce identical bridge events", async () => {
      const bridgeAddr = [...KNOWN_BRIDGE_CONTRACTS][0]!;
      const logs = [
        {
          transactionHash: "0xbridge-replay-test",
          blockNumber: 50n,
          address: bridgeAddr,
          args: {
            from: bridgeAddr,
            to: "0xrecipient",
            value: 1000000n,
          },
        },
      ];

      // Run 1
      mockGetBlockNumber.mockResolvedValueOnce(100n);
      mockGetLogs.mockResolvedValueOnce([...logs]);
      mockReadContract.mockResolvedValueOnce("XRP").mockResolvedValueOnce(6);

      const adapter1 = new XrplEvmAdapter(createConfig());
      await adapter1.connect();
      const bridges1 = await adapter1.detectBridgeTransfers({
        address: "0xrecipient",
        direction: "incoming",
        fromBlock: 1,
        toBlock: 100,
      });

      // Run 2 — fresh adapter, same data
      mockGetBlockNumber.mockResolvedValueOnce(100n);
      mockGetLogs.mockResolvedValueOnce([...logs]);
      mockReadContract.mockResolvedValueOnce("XRP").mockResolvedValueOnce(6);

      const adapter2 = new XrplEvmAdapter(createConfig());
      await adapter2.connect();
      const bridges2 = await adapter2.detectBridgeTransfers({
        address: "0xrecipient",
        direction: "incoming",
        fromBlock: 1,
        toBlock: 100,
      });

      expect(bridges1.length).toBe(bridges2.length);
      expect(bridges1.length).toBe(1);

      // Compare structural fields (exclude timestamps which vary)
      expect(bridges1[0]!.sourceChainId).toBe(bridges2[0]!.sourceChainId);
      expect(bridges1[0]!.destChainId).toBe(bridges2[0]!.destChainId);
      expect(bridges1[0]!.sourceTxHash).toBe(bridges2[0]!.sourceTxHash);
      expect(bridges1[0]!.amount).toBe(bridges2[0]!.amount);
      expect(bridges1[0]!.symbol).toBe(bridges2[0]!.symbol);
      expect(bridges1[0]!.status).toBe(bridges2[0]!.status);
    });
  });

  describe("simulated bridge failure", () => {
    it("bridge event without destination tx stays in pending status", () => {
      const event = normalizeBridgeEvent({
        sourceChainId: "xrpl:main",
        destChainId: "eip155:1440002",
        sourceTxHash: "0xsource-only",
        amount: "5000000",
        symbol: "XRP",
        sender: "rSender",
        recipient: "0xRecipient",
        sourceTimestamp: "2025-01-01T00:00:00Z",
        // No destTxHash — simulates bridge that hasn't completed
      });

      expect(event.status).toBe("pending");
      expect(event.destTxHash).toBeUndefined();
      expect(event.destTimestamp).toBeUndefined();
    });

    it("bridge event can be explicitly marked as failed", () => {
      const event = normalizeBridgeEvent({
        sourceChainId: "xrpl:main",
        destChainId: "eip155:1440002",
        sourceTxHash: "0xfailed-bridge",
        status: "failed",
        amount: "5000000",
        symbol: "XRP",
        sender: "rSender",
        recipient: "0xRecipient",
        sourceTimestamp: "2025-01-01T00:00:00Z",
      });

      expect(event.status).toBe("failed");
    });

    it("failed bridge event preserves all source information", () => {
      const event = normalizeBridgeEvent({
        sourceChainId: "xrpl:main",
        destChainId: "eip155:1440002",
        sourceTxHash: "0xFAILED",
        status: "failed",
        amount: "999999",
        symbol: "XRP",
        sender: "0xSENDER",
        recipient: "0xRECIPIENT",
        sourceTimestamp: "2025-06-15T12:00:00Z",
        bridgeProofRef: "timeout:300s",
      });

      expect(event.sourceTxHash).toBe("0xfailed");
      expect(event.amount).toBe("999999");
      expect(event.sender).toBe("0xsender");
      expect(event.bridgeProofRef).toBe("timeout:300s");
    });
  });

  describe("event divergence detection", () => {
    it("different amounts on source and dest are not silently merged", () => {
      const sourceEvent = normalizeBridgeEvent({
        sourceChainId: "xrpl:main",
        destChainId: "eip155:1440002",
        sourceTxHash: "0xsource",
        amount: "1000000",
        symbol: "XRP",
        sender: "rSender",
        recipient: "0xRecipient",
        sourceTimestamp: "2025-01-01T00:00:00Z",
      });

      const destEvent = normalizeBridgeEvent({
        sourceChainId: "eip155:1440002",
        destChainId: "xrpl:main",
        sourceTxHash: "0xdest",
        amount: "999999", // Different amount — possible rounding/fee discrepancy
        symbol: "XRP",
        sender: "0xRecipient",
        recipient: "rSender",
        sourceTimestamp: "2025-01-01T00:00:30Z",
      });

      // These are independent events, not merged
      expect(sourceEvent.amount).toBe("1000000");
      expect(destEvent.amount).toBe("999999");
      expect(sourceEvent.amount).not.toBe(destEvent.amount);
    });

    it("bridge events from different chains produce different keys", () => {
      const key1 = bridgeEventKey("xrpl:main", "0xabc");
      const key2 = bridgeEventKey("eip155:1440002", "0xabc");

      expect(key1).not.toBe(key2);
    });

    it("cross-chain refs produce distinct source/dest chain IDs", () => {
      const adapter = new XrplEvmAdapter(createConfig());

      const ref = adapter.createCrossChainRef(
        "xrpl-hash",
        "0xevm-hash",
        {
          amount: "1000000",
          symbol: "XRP",
          sender: "rSender",
          recipient: "0xRecipient",
          sourceTimestamp: "2025-01-01T00:00:00Z",
        },
      );

      expect(ref.sourceChainId).toBe("xrpl:main");
      expect(ref.destChainId).toBe("eip155:1440002");
      expect(ref.sourceChainId).not.toBe(ref.destChainId);
    });
  });

  describe("batch bridge event processing", () => {
    it("handles multiple bridge events with unique keys", () => {
      const events: BridgeEvent[] = [];
      for (let i = 0; i < 50; i++) {
        events.push(
          normalizeBridgeEvent({
            sourceChainId: "xrpl:main",
            destChainId: "eip155:1440002",
            sourceTxHash: `0xbatch-${String(i).padStart(3, "0")}`,
            amount: String(1000 + i),
            symbol: "XRP",
            sender: "rSender",
            recipient: "0xRecipient",
            sourceTimestamp: "2025-01-01T00:00:00Z",
          }),
        );
      }

      // All keys should be unique
      const keys = new Set(events.map((e) => bridgeEventKey(e.sourceChainId, e.sourceTxHash)));
      expect(keys.size).toBe(50);

      // All should be pending (no dest tx)
      expect(events.every((e) => e.status === "pending")).toBe(true);
    });

    it("confirmed events have both hashes", () => {
      const events: BridgeEvent[] = [];
      for (let i = 0; i < 10; i++) {
        events.push(
          normalizeBridgeEvent({
            sourceChainId: "xrpl:main",
            destChainId: "eip155:1440002",
            sourceTxHash: `0xsrc-${i}`,
            destTxHash: `0xdst-${i}`,
            amount: String(5000 + i),
            symbol: "XRP",
            sender: "rSender",
            recipient: "0xRecipient",
            sourceTimestamp: "2025-01-01T00:00:00Z",
            destTimestamp: "2025-01-01T00:00:30Z",
          }),
        );
      }

      expect(events.every((e) => e.status === "confirmed")).toBe(true);
      expect(events.every((e) => e.destTxHash !== undefined)).toBe(true);
    });
  });
});
