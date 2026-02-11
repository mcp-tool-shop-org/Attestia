/**
 * Multi-Chain Replay Benchmark
 *
 * 3 chains × 10K events. Memory baseline. Replay time.
 */

import { bench, describe } from "vitest";
import { auditMultiChainReplay } from "../../src/multi-chain-replay.js";
import type { ChainEvent } from "../../src/multi-chain-replay.js";

function makeEvents(chainId: string, count: number): ChainEvent[] {
  const events: ChainEvent[] = [];
  for (let i = 0; i < count; i++) {
    events.push({
      chainId,
      eventHash: `evt-${chainId}-${i}`,
      sequenceIndex: i,
      timestamp: `2025-01-01T00:${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}Z`,
      data: { type: "transfer", amount: String(1000 + i), index: i },
    });
  }
  return events;
}

describe("multi-chain replay benchmarks", () => {
  const events3x10k = [
    ...makeEvents("eip155:1", 10_000),
    ...makeEvents("eip155:42161", 10_000),
    ...makeEvents("solana:mainnet-beta", 10_000),
  ];

  bench("3 chains × 10K events replay", () => {
    auditMultiChainReplay(events3x10k);
  });

  const events1x1k = makeEvents("eip155:1", 1_000);

  bench("1 chain × 1K events replay", () => {
    auditMultiChainReplay(events1x1k);
  });

  bench("deterministic double replay (same events)", () => {
    const r1 = auditMultiChainReplay(events1x1k);
    const r2 = auditMultiChainReplay(events1x1k);
    if (r1.combinedHash !== r2.combinedHash) {
      throw new Error("Non-deterministic replay");
    }
  });
});
