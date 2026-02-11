/**
 * Multi-Chain Replay Tests
 *
 * Verifies that EVM observer on mocked data for Ethereum + Arbitrum + Base
 * produces deterministic, replay-equivalent TransferEvent arrays.
 *
 * This is Attestia's core replay invariant extended to multi-chain:
 * replaying the same chain data twice must produce identical events.
 *
 * Note: All queries use `direction: "incoming"` to ensure exactly one
 * getLogs mock call per getTransfers invocation (the observer calls getLogs
 * once for incoming and once for outgoing when direction is not specified).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvmObserver } from "../../src/evm/evm-observer.js";
import { CHAINS } from "../../src/chains.js";
import { canonicalTxKey } from "../../src/evm/reorg-detector.js";
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
// Fixtures
// =============================================================================

function createConfig(
  chain = CHAINS.ETHEREUM_MAINNET,
  profile?: ObserverConfig["profile"],
): ObserverConfig {
  return {
    chain,
    rpcUrl: "https://mock-rpc.example.com",
    timeoutMs: 5000,
    ...(profile && { profile }),
  };
}

function makeTransferLog(
  txHash: string,
  blockNumber: bigint,
  from: string,
  to: string,
  value: bigint,
  tokenAddress = "0xtoken",
) {
  return {
    transactionHash: txHash,
    blockNumber,
    address: tokenAddress,
    args: { from, to, value },
  };
}

const FIXTURE_LOGS_ETH = [
  makeTransferLog("0xeth-tx1", 1000n, "0xsender", "0xaddr", 500000n),
  makeTransferLog("0xeth-tx2", 1001n, "0xsender2", "0xaddr", 1000000n),
  makeTransferLog("0xeth-tx3", 1003n, "0xsender3", "0xaddr", 250000n),
];

const FIXTURE_LOGS_ARB = [
  makeTransferLog("0xarb-tx1", 50000n, "0xsender", "0xaddr", 500000n, "0xarb-token"),
  makeTransferLog("0xarb-tx2", 50002n, "0xsender4", "0xaddr", 750000n, "0xarb-token"),
];

const FIXTURE_LOGS_BASE = [
  makeTransferLog("0xbase-tx1", 80000n, "0xsender3", "0xaddr", 300000n, "0xbase-token"),
];

// =============================================================================
// Tests
// =============================================================================

describe("Multi-chain replay determinism", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContract.mockReset();
    mockGetBlock.mockReset();
    mockGetLogs.mockResolvedValue([]);
  });

  it("two independent replays of the same chain produce identical events", async () => {
    // Run 1: Ethereum
    mockGetBlockNumber.mockResolvedValueOnce(2000n);
    mockGetLogs.mockResolvedValueOnce([...FIXTURE_LOGS_ETH]);
    mockReadContract
      .mockResolvedValueOnce("USDC")
      .mockResolvedValueOnce(6);

    const obs1 = new EvmObserver(createConfig());
    await obs1.connect();
    const result1 = await obs1.getTransfers({
      address: "0xaddr",
      direction: "incoming",
      fromBlock: 999,
      toBlock: 2000,
    });

    // Run 2: Same data
    mockGetBlockNumber.mockResolvedValueOnce(2000n);
    mockGetLogs.mockResolvedValueOnce([...FIXTURE_LOGS_ETH]);
    mockReadContract
      .mockResolvedValueOnce("USDC")
      .mockResolvedValueOnce(6);

    const obs2 = new EvmObserver(createConfig());
    await obs2.connect();
    const result2 = await obs2.getTransfers({
      address: "0xaddr",
      direction: "incoming",
      fromBlock: 999,
      toBlock: 2000,
    });

    expect(result1.length).toBe(result2.length);
    expect(result1.length).toBe(3);

    for (let i = 0; i < result1.length; i++) {
      expect(result1[i]!.txHash).toBe(result2[i]!.txHash);
      expect(result1[i]!.blockNumber).toBe(result2[i]!.blockNumber);
      expect(result1[i]!.amount).toBe(result2[i]!.amount);
      expect(result1[i]!.from).toBe(result2[i]!.from);
      expect(result1[i]!.to).toBe(result2[i]!.to);
      expect(result1[i]!.symbol).toBe(result2[i]!.symbol);
      expect(result1[i]!.decimals).toBe(result2[i]!.decimals);
    }
  });

  it("events from different chains have unique canonical keys", async () => {
    // Ethereum events
    mockGetBlockNumber.mockResolvedValueOnce(2000n);
    mockGetLogs.mockResolvedValueOnce([...FIXTURE_LOGS_ETH]);
    mockReadContract
      .mockResolvedValueOnce("USDC")
      .mockResolvedValueOnce(6);

    const ethObs = new EvmObserver(createConfig());
    await ethObs.connect();
    const ethEvents = await ethObs.getTransfers({
      address: "0xaddr",
      direction: "incoming",
      fromBlock: 999,
      toBlock: 2000,
    });

    // Arbitrum events
    mockGetBlockNumber.mockResolvedValueOnce(60000n);
    mockGetLogs.mockResolvedValueOnce([...FIXTURE_LOGS_ARB]);
    mockReadContract
      .mockResolvedValueOnce("ARB-USDC")
      .mockResolvedValueOnce(6);

    const arbObs = new EvmObserver(createConfig(CHAINS.ARBITRUM_ONE));
    await arbObs.connect();
    const arbEvents = await arbObs.getTransfers({
      address: "0xaddr",
      direction: "incoming",
      fromBlock: 49999,
      toBlock: 60000,
    });

    // All canonical keys should be unique across chains
    const allKeys = new Set<string>();
    for (const e of [...ethEvents, ...arbEvents]) {
      const key = canonicalTxKey(e.chainId, e.txHash);
      expect(allKeys.has(key)).toBe(false);
      allKeys.add(key);
    }

    expect(allKeys.size).toBe(ethEvents.length + arbEvents.length);
  });

  it("replayed events sort by block number within each chain", async () => {
    // Out-of-order logs (block 1003 before 1001)
    const shuffledLogs = [
      FIXTURE_LOGS_ETH[2]!, // block 1003
      FIXTURE_LOGS_ETH[0]!, // block 1000
      FIXTURE_LOGS_ETH[1]!, // block 1001
    ];

    mockGetBlockNumber.mockResolvedValueOnce(2000n);
    mockGetLogs.mockResolvedValueOnce([...shuffledLogs]);
    mockReadContract
      .mockResolvedValueOnce("USDC")
      .mockResolvedValueOnce(6);

    const obs = new EvmObserver(createConfig());
    await obs.connect();
    const result = await obs.getTransfers({
      address: "0xaddr",
      direction: "incoming",
      fromBlock: 999,
      toBlock: 2000,
    });

    // Should be sorted ascending by blockNumber
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.blockNumber).toBeGreaterThanOrEqual(result[i - 1]!.blockNumber);
    }
  });

  it("aggregates events from three chains and maintains replay determinism", async () => {
    const allEvents: TransferEvent[] = [];

    // Ethereum
    mockGetBlockNumber.mockResolvedValueOnce(2000n);
    mockGetLogs.mockResolvedValueOnce([...FIXTURE_LOGS_ETH]);
    mockReadContract.mockResolvedValueOnce("USDC").mockResolvedValueOnce(6);

    const ethObs = new EvmObserver(createConfig());
    await ethObs.connect();
    allEvents.push(...await ethObs.getTransfers({
      address: "0xaddr",
      direction: "incoming",
      fromBlock: 999,
      toBlock: 2000,
    }));

    // Arbitrum
    mockGetBlockNumber.mockResolvedValueOnce(60000n);
    mockGetLogs.mockResolvedValueOnce([...FIXTURE_LOGS_ARB]);
    mockReadContract.mockResolvedValueOnce("ARB-USDC").mockResolvedValueOnce(6);

    const arbObs = new EvmObserver(createConfig(CHAINS.ARBITRUM_ONE));
    await arbObs.connect();
    allEvents.push(...await arbObs.getTransfers({
      address: "0xaddr",
      direction: "incoming",
      fromBlock: 49999,
      toBlock: 60000,
    }));

    // Base
    mockGetBlockNumber.mockResolvedValueOnce(90000n);
    mockGetLogs.mockResolvedValueOnce([...FIXTURE_LOGS_BASE]);
    mockReadContract.mockResolvedValueOnce("BASE-USDC").mockResolvedValueOnce(6);

    const baseObs = new EvmObserver(createConfig(CHAINS.BASE_MAINNET));
    await baseObs.connect();
    allEvents.push(...await baseObs.getTransfers({
      address: "0xaddr",
      direction: "incoming",
      fromBlock: 79999,
      toBlock: 90000,
    }));

    // Total: 3 ETH + 2 ARB + 1 BASE = 6 events
    expect(allEvents.length).toBe(6);

    // Each event has correct chainId
    const ethCount = allEvents.filter((e) => e.chainId === "eip155:1").length;
    const arbCount = allEvents.filter((e) => e.chainId === "eip155:42161").length;
    const baseCount = allEvents.filter((e) => e.chainId === "eip155:8453").length;

    expect(ethCount).toBe(3);
    expect(arbCount).toBe(2);
    expect(baseCount).toBe(1);

    // All canonical keys unique
    const keys = allEvents.map((e) => canonicalTxKey(e.chainId, e.txHash));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("hash-chain equivalence: JSON serialization of events is identical across replays", async () => {
    const serializations: string[] = [];

    for (let run = 0; run < 2; run++) {
      const events: TransferEvent[] = [];

      // Ethereum
      mockGetBlockNumber.mockResolvedValueOnce(2000n);
      mockGetLogs.mockResolvedValueOnce([...FIXTURE_LOGS_ETH]);
      mockReadContract.mockResolvedValueOnce("USDC").mockResolvedValueOnce(6);

      const ethObs = new EvmObserver(createConfig());
      await ethObs.connect();
      events.push(...await ethObs.getTransfers({
        address: "0xaddr",
        direction: "incoming",
        fromBlock: 999,
        toBlock: 2000,
      }));

      // Arbitrum
      mockGetBlockNumber.mockResolvedValueOnce(60000n);
      mockGetLogs.mockResolvedValueOnce([...FIXTURE_LOGS_ARB]);
      mockReadContract.mockResolvedValueOnce("ARB-USDC").mockResolvedValueOnce(6);

      const arbObs = new EvmObserver(createConfig(CHAINS.ARBITRUM_ONE));
      await arbObs.connect();
      events.push(...await arbObs.getTransfers({
        address: "0xaddr",
        direction: "incoming",
        fromBlock: 49999,
        toBlock: 60000,
      }));

      // Strip observedAt and timestamp (they vary with wall clock)
      const stripped = events.map(({ observedAt, timestamp, ...rest }) => rest);
      serializations.push(JSON.stringify(stripped));
    }

    expect(serializations[0]).toBe(serializations[1]);
  });
});
