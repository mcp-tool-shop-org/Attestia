/**
 * Multi-Chain Replay Audit Tests
 *
 * Full replay across 3 chains → identical hash.
 * Single-chain divergence detected.
 * Two independent replays produce same result.
 */

import { describe, it, expect } from "vitest";
import {
  computeChainHashChain,
  computeCombinedHash,
  auditMultiChainReplay,
} from "../src/multi-chain-replay.js";
import type { ChainEvent } from "../src/multi-chain-replay.js";

// =============================================================================
// Helpers
// =============================================================================

function makeEvent(
  chainId: string,
  index: number,
  data: Record<string, unknown> = {},
): ChainEvent {
  return {
    chainId,
    eventHash: `evt-${chainId}-${index}`,
    sequenceIndex: index,
    timestamp: `2025-01-01T00:00:${String(index).padStart(2, "0")}Z`,
    data: { type: "transfer", amount: String(1000 + index), ...data },
  };
}

function makeChainEvents(chainId: string, count: number): ChainEvent[] {
  return Array.from({ length: count }, (_, i) => makeEvent(chainId, i));
}

// =============================================================================
// Tests
// =============================================================================

describe("computeChainHashChain", () => {
  it("produces deterministic hash for same events", () => {
    const events = makeChainEvents("eip155:1", 10);

    const r1 = computeChainHashChain("eip155:1", events);
    const r2 = computeChainHashChain("eip155:1", events);

    expect(r1.hashChain).toBe(r2.hashChain);
    expect(r1.hashChain.length).toBe(64); // SHA-256 hex
  });

  it("different events produce different hash", () => {
    const events1 = makeChainEvents("eip155:1", 10);
    const events2 = [
      ...makeChainEvents("eip155:1", 9),
      makeEvent("eip155:1", 9, { amount: "different" }),
    ];

    const r1 = computeChainHashChain("eip155:1", events1);
    const r2 = computeChainHashChain("eip155:1", events2);

    expect(r1.hashChain).not.toBe(r2.hashChain);
  });

  it("different chain IDs produce different genesis", () => {
    const events: ChainEvent[] = []; // Empty events, just genesis

    const r1 = computeChainHashChain("eip155:1", events);
    const r2 = computeChainHashChain("eip155:42161", events);

    expect(r1.hashChain).not.toBe(r2.hashChain);
  });

  it("tracks event count and first/last hashes", () => {
    const events = makeChainEvents("eip155:1", 5);
    const result = computeChainHashChain("eip155:1", events);

    expect(result.eventCount).toBe(5);
    expect(result.firstEventHash).toBeDefined();
    expect(result.lastEventHash).toBeDefined();
    expect(result.firstEventHash).not.toBe(result.lastEventHash);
  });
});

describe("computeCombinedHash", () => {
  it("combines chain hashes deterministically", () => {
    const chains = [
      computeChainHashChain("eip155:1", makeChainEvents("eip155:1", 5)),
      computeChainHashChain("eip155:42161", makeChainEvents("eip155:42161", 3)),
    ];

    const h1 = computeCombinedHash(chains);
    const h2 = computeCombinedHash(chains);

    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);
  });

  it("input order does not matter (sorted by chainId)", () => {
    const chain1 = computeChainHashChain("eip155:1", makeChainEvents("eip155:1", 5));
    const chain2 = computeChainHashChain("eip155:42161", makeChainEvents("eip155:42161", 3));

    const h1 = computeCombinedHash([chain1, chain2]);
    const h2 = computeCombinedHash([chain2, chain1]); // Reversed order

    expect(h1).toBe(h2);
  });
});

describe("auditMultiChainReplay", () => {
  it("full replay across 3 chains produces PASS", () => {
    const events = [
      ...makeChainEvents("eip155:1", 10),
      ...makeChainEvents("eip155:42161", 5),
      ...makeChainEvents("solana:mainnet-beta", 8),
    ];

    const result = auditMultiChainReplay(events);

    expect(result.verdict).toBe("PASS");
    expect(result.chains.length).toBe(3);
    expect(result.discrepancies).toHaveLength(0);
    expect(result.combinedHash.length).toBe(64);
  });

  it("two independent replays produce identical hash", () => {
    const events = [
      ...makeChainEvents("eip155:1", 10),
      ...makeChainEvents("eip155:42161", 5),
    ];

    const r1 = auditMultiChainReplay(events);
    const r2 = auditMultiChainReplay(events);

    expect(r1.combinedHash).toBe(r2.combinedHash);
    expect(r1.chains.length).toBe(r2.chains.length);
    for (let i = 0; i < r1.chains.length; i++) {
      expect(r1.chains[i]!.hashChain).toBe(r2.chains[i]!.hashChain);
    }
  });

  it("single-chain divergence is detected", () => {
    const events = [
      ...makeChainEvents("eip155:1", 10),
      ...makeChainEvents("eip155:42161", 5),
    ];

    const expected = auditMultiChainReplay(events);

    // Add one more event to chain 1
    const divergedEvents = [
      ...events,
      makeEvent("eip155:1", 10, { extra: "divergence" }),
    ];

    const diverged = auditMultiChainReplay(
      divergedEvents,
      expected.combinedHash,
    );

    expect(diverged.verdict).toBe("FAIL");
    expect(diverged.discrepancies.length).toBeGreaterThan(0);
    expect(diverged.combinedHash).not.toBe(expected.combinedHash);
  });

  it("expected hash match produces PASS", () => {
    const events = makeChainEvents("eip155:1", 5);

    const first = auditMultiChainReplay(events);
    const second = auditMultiChainReplay(events, first.combinedHash);

    expect(second.verdict).toBe("PASS");
  });

  it("events are sorted by sequence index within chain", () => {
    // Provide events out of order
    const events: ChainEvent[] = [
      makeEvent("eip155:1", 5),
      makeEvent("eip155:1", 1),
      makeEvent("eip155:1", 3),
      makeEvent("eip155:1", 0),
      makeEvent("eip155:1", 2),
      makeEvent("eip155:1", 4),
    ];

    const result = auditMultiChainReplay(events);

    expect(result.verdict).toBe("PASS");
    expect(result.chains[0]!.eventCount).toBe(6);
  });

  it("per-chain results are accessible", () => {
    const events = [
      ...makeChainEvents("eip155:1", 10),
      ...makeChainEvents("solana:mainnet-beta", 20),
    ];

    const result = auditMultiChainReplay(events);

    const ethChain = result.chains.find((c) => c.chainId === "eip155:1");
    const solChain = result.chains.find((c) => c.chainId === "solana:mainnet-beta");

    expect(ethChain).toBeDefined();
    expect(ethChain!.eventCount).toBe(10);
    expect(solChain).toBeDefined();
    expect(solChain!.eventCount).toBe(20);
  });
});
