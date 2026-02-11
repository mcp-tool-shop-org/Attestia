/**
 * Parallel Observation Benchmark
 *
 * Simulates parallel getTransfers() across 4 chains.
 * Measures overhead of multi-chain observation.
 */

import { bench, describe } from "vitest";
import type { TransferEvent } from "../../src/observer.js";

/**
 * Simulates transfer event generation for benchmarking.
 * In production this would call actual chain RPC endpoints.
 */
function simulateTransfers(chainId: string, count: number): TransferEvent[] {
  const events: TransferEvent[] = [];
  for (let i = 0; i < count; i++) {
    events.push({
      txHash: `0x${chainId}-${i}`,
      blockNumber: 1000 + i,
      timestamp: `2025-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`,
      from: `0xsender${i}`,
      to: `0xrecipient${i}`,
      amount: String(1000 + i),
      symbol: "ETH",
      decimals: 18,
      direction: "incoming" as const,
    });
  }
  return events;
}

describe("parallel observation benchmarks", () => {
  const chains = ["eip155:1", "eip155:42161", "eip155:8453", "eip155:10"];

  bench("4 chains × 1K transfers sequential", () => {
    const results: TransferEvent[][] = [];
    for (const chainId of chains) {
      results.push(simulateTransfers(chainId, 1000));
    }
    if (results.length !== 4) throw new Error("unexpected");
  });

  bench("4 chains × 1K transfers parallel simulation", async () => {
    const promises = chains.map(
      (chainId) =>
        new Promise<TransferEvent[]>((resolve) => {
          // Simulate async with immediate resolve
          resolve(simulateTransfers(chainId, 1000));
        }),
    );
    const results = await Promise.all(promises);
    if (results.length !== 4) throw new Error("unexpected");
  });

  bench("canonical key generation for 10K events", () => {
    const events = simulateTransfers("eip155:1", 10_000);
    const keys = new Set<string>();
    for (const e of events) {
      keys.add(`eip155:1:${e.txHash}:${e.blockNumber}`);
    }
    if (keys.size !== 10_000) throw new Error("non-unique keys");
  });
});
