/**
 * L2 Stress Tests
 *
 * 10K events across 3 L2 chains — verifies ordering and
 * determinism at scale. Uses canonical tx key uniqueness
 * and block-number ordering as invariants.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvmObserver } from "../../src/evm/evm-observer.js";
import { canonicalTxKey } from "../../src/evm/reorg-detector.js";
import { CHAINS } from "../../src/chains.js";
import type { ObserverConfig, TransferEvent } from "../../src/observer.js";

// =============================================================================
// Mocks
// =============================================================================

const mockGetBlockNumber = vi.fn();
const mockGetBalance = vi.fn().mockResolvedValue(0n);
const mockReadContract = vi.fn();
const mockGetLogs = vi.fn();
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

// =============================================================================
// Helpers
// =============================================================================

function createConfig(
  chain = CHAINS.ETHEREUM_MAINNET,
): ObserverConfig {
  return {
    chain,
    rpcUrl: "https://mock-rpc.example.com",
    timeoutMs: 5000,
  };
}

/**
 * Generate N transfer logs with sequential block numbers and unique tx hashes.
 */
function generateLogs(
  count: number,
  startBlock: number,
  prefix: string,
  tokenAddress = "0xtoken",
) {
  const logs = [];
  for (let i = 0; i < count; i++) {
    logs.push({
      transactionHash: `0x${prefix}-tx-${String(i).padStart(5, "0")}`,
      blockNumber: BigInt(startBlock + i),
      address: tokenAddress,
      args: {
        from: `0xsender-${i % 100}`,
        to: "0xaddr",
        value: BigInt(1000 + i),
      },
    });
  }
  return logs;
}

// =============================================================================
// Tests
// =============================================================================

describe("L2 stress tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContract.mockReset();
    mockGetBlock.mockReset();
    mockGetLogs.mockResolvedValue([]);
  });

  it("handles 3,333 events per chain (≈10K total) with unique canonical keys", async () => {
    const PER_CHAIN = 3_334;
    const allEvents: TransferEvent[] = [];

    const chains = [
      { chain: CHAINS.ARBITRUM_ONE, prefix: "arb", start: 100_000, token: "0xarb-token" },
      { chain: CHAINS.OPTIMISM, prefix: "op", start: 200_000, token: "0xop-token" },
      { chain: CHAINS.BASE_MAINNET, prefix: "base", start: 300_000, token: "0xbase-token" },
    ];

    for (const { chain, prefix, start, token } of chains) {
      const logs = generateLogs(PER_CHAIN, start, prefix, token);

      mockGetBlockNumber.mockResolvedValueOnce(BigInt(start + PER_CHAIN + 100));
      mockGetLogs.mockResolvedValueOnce(logs);
      mockReadContract
        .mockResolvedValueOnce(`${prefix.toUpperCase()}-USDC`)
        .mockResolvedValueOnce(6);

      const obs = new EvmObserver(createConfig(chain));
      await obs.connect();
      const events = await obs.getTransfers({
        address: "0xaddr",
        direction: "incoming",
        fromBlock: start - 1,
        toBlock: start + PER_CHAIN + 100,
      });

      allEvents.push(...events);
    }

    // Total event count: 3 × 3,334 = 10,002
    expect(allEvents.length).toBe(PER_CHAIN * 3);

    // All canonical keys must be unique
    const keys = new Set(
      allEvents.map((e) => canonicalTxKey(e.chainId, e.txHash)),
    );
    expect(keys.size).toBe(allEvents.length);
  });

  it("each chain's events are sorted by block number ascending", async () => {
    const PER_CHAIN = 500;

    const chains = [
      { chain: CHAINS.ARBITRUM_ONE, prefix: "arb", start: 100_000, token: "0xarb-token" },
      { chain: CHAINS.OPTIMISM, prefix: "op", start: 200_000, token: "0xop-token" },
      { chain: CHAINS.BASE_MAINNET, prefix: "base", start: 300_000, token: "0xbase-token" },
    ];

    for (const { chain, prefix, start, token } of chains) {
      // Shuffle the logs to simulate out-of-order RPC responses
      const logs = generateLogs(PER_CHAIN, start, prefix, token);
      const shuffled = [...logs].reverse();

      mockGetBlockNumber.mockResolvedValueOnce(BigInt(start + PER_CHAIN + 100));
      mockGetLogs.mockResolvedValueOnce(shuffled);
      mockReadContract
        .mockResolvedValueOnce(`${prefix.toUpperCase()}-TOKEN`)
        .mockResolvedValueOnce(18);

      const obs = new EvmObserver(createConfig(chain));
      await obs.connect();
      const events = await obs.getTransfers({
        address: "0xaddr",
        direction: "incoming",
        fromBlock: start - 1,
        toBlock: start + PER_CHAIN + 100,
      });

      expect(events.length).toBe(PER_CHAIN);

      // Verify ascending block order
      for (let i = 1; i < events.length; i++) {
        expect(events[i]!.blockNumber).toBeGreaterThanOrEqual(
          events[i - 1]!.blockNumber,
        );
      }
    }
  });

  it("deterministic: two runs of the same 10K events produce identical results", async () => {
    const PER_CHAIN = 1_000;
    const runs: string[] = [];

    const chainDefs = [
      { chain: CHAINS.ARBITRUM_ONE, prefix: "arb", start: 100_000, token: "0xarb-token" },
      { chain: CHAINS.OPTIMISM, prefix: "op", start: 200_000, token: "0xop-token" },
      { chain: CHAINS.BASE_MAINNET, prefix: "base", start: 300_000, token: "0xbase-token" },
    ];

    for (let run = 0; run < 2; run++) {
      const allEvents: TransferEvent[] = [];

      for (const { chain, prefix, start, token } of chainDefs) {
        const logs = generateLogs(PER_CHAIN, start, prefix, token);

        mockGetBlockNumber.mockResolvedValueOnce(BigInt(start + PER_CHAIN + 100));
        mockGetLogs.mockResolvedValueOnce(logs);
        mockReadContract
          .mockResolvedValueOnce(`${prefix.toUpperCase()}-USDC`)
          .mockResolvedValueOnce(6);

        const obs = new EvmObserver(createConfig(chain));
        await obs.connect();
        const events = await obs.getTransfers({
          address: "0xaddr",
          direction: "incoming",
          fromBlock: start - 1,
          toBlock: start + PER_CHAIN + 100,
        });
        allEvents.push(...events);
      }

      // Strip wall-clock-dependent fields
      const stripped = allEvents.map(({ observedAt, timestamp, ...rest }) => rest);
      runs.push(JSON.stringify(stripped));
    }

    expect(runs[0]).toBe(runs[1]);
  });

  it("chain IDs are preserved across large event sets", async () => {
    const PER_CHAIN = 100;

    const chainDefs = [
      { chain: CHAINS.ARBITRUM_ONE, prefix: "arb", start: 100_000, token: "0xarb-token", expectedId: "eip155:42161" },
      { chain: CHAINS.OPTIMISM, prefix: "op", start: 200_000, token: "0xop-token", expectedId: "eip155:10" },
      { chain: CHAINS.BASE_MAINNET, prefix: "base", start: 300_000, token: "0xbase-token", expectedId: "eip155:8453" },
    ];

    for (const { chain, prefix, start, token, expectedId } of chainDefs) {
      const logs = generateLogs(PER_CHAIN, start, prefix, token);

      mockGetBlockNumber.mockResolvedValueOnce(BigInt(start + PER_CHAIN + 100));
      mockGetLogs.mockResolvedValueOnce(logs);
      mockReadContract
        .mockResolvedValueOnce(`${prefix.toUpperCase()}-TOKEN`)
        .mockResolvedValueOnce(18);

      const obs = new EvmObserver(createConfig(chain));
      await obs.connect();
      const events = await obs.getTransfers({
        address: "0xaddr",
        direction: "incoming",
        fromBlock: start - 1,
        toBlock: start + PER_CHAIN + 100,
      });

      // Every event should carry the correct chainId
      for (const event of events) {
        expect(event.chainId).toBe(expectedId);
      }
    }
  });

  it("limit is respected even with large event sets", async () => {
    const logs = generateLogs(500, 100_000, "arb", "0xarb-token");

    mockGetBlockNumber.mockResolvedValueOnce(200_000n);
    mockGetLogs.mockResolvedValueOnce(logs);
    mockReadContract
      .mockResolvedValueOnce("ARB-USDC")
      .mockResolvedValueOnce(6);

    const obs = new EvmObserver(createConfig(CHAINS.ARBITRUM_ONE));
    await obs.connect();
    const events = await obs.getTransfers({
      address: "0xaddr",
      direction: "incoming",
      fromBlock: 99_999,
      toBlock: 200_000,
      limit: 50,
    });

    expect(events.length).toBe(50);

    // First 50 should be the lowest block numbers (sorted ascending)
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.blockNumber).toBeGreaterThanOrEqual(
        events[i - 1]!.blockNumber,
      );
    }
  });
});
