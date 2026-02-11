/**
 * Tests for ReorgDetector.
 */

import { describe, it, expect } from "vitest";
import { ReorgDetector } from "../../src/evm/reorg-detector.js";
import type { BlockRecord } from "../../src/evm/reorg-detector.js";

function makeBlock(blockNumber: number, blockHash: string): BlockRecord {
  return {
    blockNumber,
    blockHash,
    timestamp: new Date().toISOString(),
  };
}

describe("ReorgDetector", () => {
  it("records blocks without reorg", () => {
    const detector = new ReorgDetector("eip155:42161");

    expect(detector.checkBlock(makeBlock(100, "0xaaa"))).toBeUndefined();
    expect(detector.checkBlock(makeBlock(101, "0xbbb"))).toBeUndefined();
    expect(detector.checkBlock(makeBlock(102, "0xccc"))).toBeUndefined();

    expect(detector.size).toBe(3);
  });

  it("detects reorg when same block number has different hash", () => {
    const detector = new ReorgDetector("eip155:42161");

    detector.checkBlock(makeBlock(100, "0xaaa"));
    detector.checkBlock(makeBlock(101, "0xbbb"));

    // Block 100 now has a different hash → reorg
    const reorg = detector.checkBlock(makeBlock(100, "0xDDD"));

    expect(reorg).toBeDefined();
    expect(reorg!.chainId).toBe("eip155:42161");
    expect(reorg!.blockNumber).toBe(100);
    expect(reorg!.expectedHash).toBe("0xaaa");
    expect(reorg!.actualHash).toBe("0xDDD");
  });

  it("does not trigger reorg when same block has same hash", () => {
    const detector = new ReorgDetector("eip155:42161");

    detector.checkBlock(makeBlock(100, "0xaaa"));

    // Same hash at same block number → no reorg
    expect(detector.checkBlock(makeBlock(100, "0xaaa"))).toBeUndefined();
  });

  it("prunes old entries when buffer exceeds max depth", () => {
    const detector = new ReorgDetector("eip155:10", 3); // Small buffer

    detector.checkBlock(makeBlock(100, "0xa"));
    detector.checkBlock(makeBlock(101, "0xb"));
    detector.checkBlock(makeBlock(102, "0xc"));
    detector.checkBlock(makeBlock(103, "0xd")); // Should prune block 100

    expect(detector.size).toBe(3);
    expect(detector.has(100)).toBe(false);
    expect(detector.has(103)).toBe(true);
  });

  it("reset clears the buffer", () => {
    const detector = new ReorgDetector("eip155:42161");

    detector.checkBlock(makeBlock(100, "0xaaa"));
    detector.checkBlock(makeBlock(101, "0xbbb"));

    detector.reset();

    expect(detector.size).toBe(0);

    // After reset, same blocks can be re-added without reorg
    expect(detector.checkBlock(makeBlock(100, "0xNEW"))).toBeUndefined();
  });

  it("fail-closed: reorg is detected immediately", () => {
    const detector = new ReorgDetector("eip155:8453");

    detector.checkBlock(makeBlock(500, "0xoriginal"));

    // Single-block reorg
    const reorg = detector.checkBlock(makeBlock(500, "0xreorged"));
    expect(reorg).toBeDefined();
    expect(reorg!.expectedHash).toBe("0xoriginal");
    expect(reorg!.actualHash).toBe("0xreorged");
  });

  it("detects multi-block reorg", () => {
    const detector = new ReorgDetector("eip155:10");

    detector.checkBlock(makeBlock(100, "0xa"));
    detector.checkBlock(makeBlock(101, "0xb"));
    detector.checkBlock(makeBlock(102, "0xc"));

    // Reorg replaces blocks 101 and 102
    const reorg1 = detector.checkBlock(makeBlock(101, "0xB_NEW"));
    expect(reorg1).toBeDefined();

    // After detecting first reorg, subsequent blocks would also mismatch
    const reorg2 = detector.checkBlock(makeBlock(102, "0xC_NEW"));
    expect(reorg2).toBeDefined();
  });

  it("bufferDepth field reflects current buffer size", () => {
    const detector = new ReorgDetector("eip155:42161");

    detector.checkBlock(makeBlock(100, "0xa"));
    detector.checkBlock(makeBlock(101, "0xb"));
    detector.checkBlock(makeBlock(102, "0xc"));

    const reorg = detector.checkBlock(makeBlock(100, "0xNEW"));
    expect(reorg!.bufferDepth).toBe(3);
  });
});
